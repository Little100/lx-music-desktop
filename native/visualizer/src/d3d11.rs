use windows::core::*;
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Direct3D::*;
use windows::Win32::Graphics::Direct3D11::*;
use windows::Win32::Graphics::Dxgi::*;
use windows::Win32::Graphics::Dxgi::Common::*;
use windows::Win32::UI::WindowsAndMessaging::*;
use crate::smoothing::Bar;

const VS_SOURCE: &[u8] = br#"
cbuffer Constants : register(b0) {
  float4 u_color;
  float u_opacity;
  float u_heightScale;
  float u_barWidth;
  float u_canvasWidth;
  float u_canvasHeight;
  float u_centerMirror;
  float u_gap;
  float _pad;
};

struct BarData {
  float value;
  float peak;
};

StructuredBuffer<BarData> bars : register(t0);

struct VsOut {
  float4 pos : SV_Position;
  float yNorm : TEXCOORD0;
  float alpha : TEXCOORD1;
};

VsOut main(uint vertexId : SV_VertexID, uint instanceId : SV_InstanceID) {
  VsOut o;

  float2 quad[6] = {
    float2(0,0), float2(1,0), float2(1,1),
    float2(0,0), float2(1,1), float2(0,1)
  };
  float2 p = quad[vertexId];

  BarData bar = bars[instanceId];
  float v = bar.value;
  float h = min(1.0, v * u_heightScale);

  float stepW = u_barWidth + u_gap;
  float x;
  if (u_centerMirror > 0.5) {
    uint halfId = instanceId / 2;
    float offset = halfId * stepW;
    if (instanceId % 2 == 0) {
      x = u_canvasWidth * 0.5 + offset;
    } else {
      x = u_canvasWidth * 0.5 - offset - u_barWidth;
    }
  } else {
    x = instanceId * stepW;
  }

  float px = (x + p.x * u_barWidth) / u_canvasWidth * 2.0 - 1.0;
  float py = -1.0 + p.y * h * 2.0;

  o.pos = float4(px, py, 0, 1);
  o.yNorm = p.y;
  o.alpha = (0.35 + v * 0.65) * u_opacity;
  return o;
}
"#;

const PS_SOURCE: &[u8] = br#"
cbuffer Constants : register(b0) {
  float4 u_color;
  float u_opacity;
  float u_heightScale;
  float u_barWidth;
  float u_canvasWidth;
  float u_canvasHeight;
  float u_centerMirror;
  float u_gap;
  float _pad;
};

struct PsIn {
  float4 pos : SV_Position;
  float yNorm : TEXCOORD0;
  float alpha : TEXCOORD1;
};

float4 main(PsIn i) : SV_Target {
  float gradAlpha;
  if (i.yNorm < 0.4) {
    gradAlpha = lerp(0.08, 0.5, i.yNorm / 0.4);
  } else {
    gradAlpha = lerp(0.5, 1.0, (i.yNorm - 0.4) / 0.6);
  }
  float a = i.alpha * gradAlpha;

  float3 col = u_color.rgb;
  if (i.yNorm > 0.92) {
    col = min(float3(1,1,1), col + 0.16);
  }

  return float4(col * a, a);
}
"#;

#[repr(C)]
#[derive(Clone, Copy)]
struct Constants {
  color: [f32; 4],
  opacity: f32,
  height_scale: f32,
  bar_width: f32,
  canvas_width: f32,
  canvas_height: f32,
  center_mirror: f32,
  gap: f32,
  _pad: f32,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct GpuBar {
  value: f32,
  peak: f32,
}

pub struct D3D11Renderer {
  hwnd: HWND,
  _device: ID3D11Device,
  context: ID3D11DeviceContext,
  swap_chain: IDXGISwapChain1,
  rtv: Option<ID3D11RenderTargetView>,
  vs: ID3D11VertexShader,
  ps: ID3D11PixelShader,
  cb: ID3D11Buffer,
  bar_buffer: ID3D11Buffer,
  bar_srv: ID3D11ShaderResourceView,
  width: u32,
  height: u32,
  max_bars: u32,
  gpu_bars_cache: Vec<GpuBar>,
}

impl D3D11Renderer {
  pub fn new(hwnd: HWND, width: u32, height: u32) -> std::result::Result<Self, String> {
    unsafe {
      let mut device: Option<ID3D11Device> = None;
      let mut context: Option<ID3D11DeviceContext> = None;

      D3D11CreateDevice(
        None,
        D3D_DRIVER_TYPE_HARDWARE,
        None,
        D3D11_CREATE_DEVICE_FLAG(0),
        Some(&[D3D_FEATURE_LEVEL_11_0]),
        D3D11_SDK_VERSION,
        Some(&mut device),
        None,
        Some(&mut context),
      ).map_err(|e| e.to_string())?;

      let device = device.unwrap();
      let context = context.unwrap();

      let dxgi_device: IDXGIDevice = device.cast().map_err(|e| e.to_string())?;
      let adapter = dxgi_device.GetAdapter().map_err(|e| e.to_string())?;
      let factory: IDXGIFactory2 = adapter.GetParent().map_err(|e| e.to_string())?;

      let desc = DXGI_SWAP_CHAIN_DESC1 {
        Width: width,
        Height: height,
        Format: DXGI_FORMAT_B8G8R8A8_UNORM,
        SampleDesc: DXGI_SAMPLE_DESC { Count: 1, Quality: 0 },
        BufferUsage: DXGI_USAGE_RENDER_TARGET_OUTPUT,
        BufferCount: 2,
        SwapEffect: DXGI_SWAP_EFFECT_FLIP_DISCARD,
        AlphaMode: DXGI_ALPHA_MODE_PREMULTIPLIED,
        ..Default::default()
      };

      let swap_chain = factory.CreateSwapChainForHwnd(&device, hwnd, &desc, None, None)
        .map_err(|e| e.to_string())?;

      let vs_blob = compile_shader(VS_SOURCE, b"main\0", b"vs_5_0\0")?;
      let ps_blob = compile_shader(PS_SOURCE, b"main\0", b"ps_5_0\0")?;

      let mut vs: Option<ID3D11VertexShader> = None;
      device.CreateVertexShader(&vs_blob, None, Some(&mut vs)).map_err(|e| e.to_string())?;
      let vs = vs.unwrap();

      let mut ps: Option<ID3D11PixelShader> = None;
      device.CreatePixelShader(&ps_blob, None, Some(&mut ps)).map_err(|e| e.to_string())?;
      let ps = ps.unwrap();

      let cb_desc = D3D11_BUFFER_DESC {
        ByteWidth: 48,
        Usage: D3D11_USAGE_DYNAMIC,
        BindFlags: D3D11_BIND_CONSTANT_BUFFER.0 as u32,
        CPUAccessFlags: D3D11_CPU_ACCESS_WRITE.0 as u32,
        ..Default::default()
      };
      let mut cb: Option<ID3D11Buffer> = None;
      device.CreateBuffer(&cb_desc, None, Some(&mut cb)).map_err(|e| e.to_string())?;
      let cb = cb.unwrap();

      let max_bars = 8192u32;
      let bar_buf_desc = D3D11_BUFFER_DESC {
        ByteWidth: max_bars * 8,
        Usage: D3D11_USAGE_DYNAMIC,
        BindFlags: D3D11_BIND_SHADER_RESOURCE.0 as u32,
        CPUAccessFlags: D3D11_CPU_ACCESS_WRITE.0 as u32,
        MiscFlags: D3D11_RESOURCE_MISC_BUFFER_STRUCTURED.0 as u32,
        StructureByteStride: 8,
      };
      let mut bar_buffer: Option<ID3D11Buffer> = None;
      device.CreateBuffer(&bar_buf_desc, None, Some(&mut bar_buffer)).map_err(|e| e.to_string())?;
      let bar_buffer = bar_buffer.unwrap();

      let srv_desc = D3D11_SHADER_RESOURCE_VIEW_DESC {
        Format: DXGI_FORMAT_UNKNOWN,
        ViewDimension: D3D_SRV_DIMENSION_BUFFER,
        Anonymous: D3D11_SHADER_RESOURCE_VIEW_DESC_0 {
          Buffer: D3D11_BUFFER_SRV {
            Anonymous1: D3D11_BUFFER_SRV_0 { FirstElement: 0 },
            Anonymous2: D3D11_BUFFER_SRV_1 { NumElements: max_bars },
          },
        },
      };
      let mut bar_srv: Option<ID3D11ShaderResourceView> = None;
      device.CreateShaderResourceView(&bar_buffer, Some(&srv_desc), Some(&mut bar_srv))
        .map_err(|e| e.to_string())?;
      let bar_srv = bar_srv.unwrap();

      let mut renderer = Self {
        hwnd, _device: device, context, swap_chain, rtv: None,
        vs, ps, cb, bar_buffer, bar_srv,
        width, height, max_bars,
        gpu_bars_cache: Vec::with_capacity(max_bars as usize * 2),
      };
      renderer.create_rtv()?;

      Ok(renderer)
    }
  }

  fn create_rtv(&mut self) -> std::result::Result<(), String> {
    unsafe {
      let back_buffer: ID3D11Texture2D = self.swap_chain.GetBuffer(0).map_err(|e| e.to_string())?;
      let mut rtv: Option<ID3D11RenderTargetView> = None;
      self._device.CreateRenderTargetView(&back_buffer, None, Some(&mut rtv))
        .map_err(|e| e.to_string())?;
      self.rtv = rtv;
      Ok(())
    }
  }

  pub fn resize(&mut self, x: i32, y: i32, width: u32, height: u32) -> std::result::Result<(), String> {
    unsafe {
      let _ = SetWindowPos(self.hwnd, None, x, y, width as i32, height as i32, SWP_NOZORDER | SWP_NOACTIVATE);

      self.rtv = None;
      self.swap_chain.ResizeBuffers(0, width, height, DXGI_FORMAT_UNKNOWN, DXGI_SWAP_CHAIN_FLAG(0))
        .map_err(|e| e.to_string())?;
      self.width = width;
      self.height = height;
      self.create_rtv()?;
      Ok(())
    }
  }

  pub fn render(&mut self, bars: &[Bar], color: &[f32; 3], opacity: f32,
    height_scale: f32, bar_width: f32, center_mirror: bool,
    show_bars: bool, _show_wave: bool)
  {
    if !show_bars { return; }
    let num_bars = bars.len() as u32;
    if num_bars == 0 { return; }

    unsafe {
      let ctx = &self.context;

      let layout_w = if center_mirror { self.width as f32 / 2.0 } else { self.width as f32 };
      let gap = 1.0f32;
      let total_gap = gap * (num_bars as f32 - 1.0);
      let bw = if bar_width > 0.0 { bar_width } else { ((layout_w - total_gap) / num_bars as f32).max(1.0) };

      let constants = Constants {
        color: [color[0], color[1], color[2], 1.0],
        opacity,
        height_scale,
        bar_width: bw,
        canvas_width: self.width as f32,
        canvas_height: self.height as f32,
        center_mirror: if center_mirror { 1.0 } else { 0.0 },
        gap,
        _pad: 0.0,
      };

      let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
      let _ = ctx.Map(&self.cb, 0, D3D11_MAP_WRITE_DISCARD, 0, Some(&mut mapped));
      std::ptr::copy_nonoverlapping(&constants as *const _ as *const u8, mapped.pData as *mut u8, 48);
      ctx.Unmap(&self.cb, 0);

      self.gpu_bars_cache.clear();
      if center_mirror {
        for b in bars.iter() {
          self.gpu_bars_cache.push(GpuBar { value: b.value, peak: b.peak });
          self.gpu_bars_cache.push(GpuBar { value: b.value, peak: b.peak });
        }
      } else {
        for b in bars.iter() {
          self.gpu_bars_cache.push(GpuBar { value: b.value, peak: b.peak });
        }
      }

      let instance_count = self.gpu_bars_cache.len() as u32;

      let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
      let _ = ctx.Map(&self.bar_buffer, 0, D3D11_MAP_WRITE_DISCARD, 0, Some(&mut mapped));
      let byte_len = (instance_count as usize * 8).min(self.max_bars as usize * 8);
      std::ptr::copy_nonoverlapping(self.gpu_bars_cache.as_ptr() as *const u8, mapped.pData as *mut u8, byte_len);
      ctx.Unmap(&self.bar_buffer, 0);

      let rtv = self.rtv.as_ref().unwrap();
      let clear_color = [0.0f32, 0.0, 0.0, 0.0];
      ctx.ClearRenderTargetView(rtv, &clear_color);
      ctx.OMSetRenderTargets(Some(&[Some(rtv.clone())]), None);

      let vp = D3D11_VIEWPORT {
        TopLeftX: 0.0, TopLeftY: 0.0,
        Width: self.width as f32, Height: self.height as f32,
        MinDepth: 0.0, MaxDepth: 1.0,
      };
      ctx.RSSetViewports(Some(&[vp]));

      ctx.VSSetShader(&self.vs, None);
      ctx.PSSetShader(&self.ps, None);
      ctx.VSSetConstantBuffers(0, Some(&[Some(self.cb.clone())]));
      ctx.PSSetConstantBuffers(0, Some(&[Some(self.cb.clone())]));
      ctx.VSSetShaderResources(0, Some(&[Some(self.bar_srv.clone())]));

      ctx.IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
      ctx.DrawInstanced(6, instance_count, 0, 0);

      let _ = self.swap_chain.Present(1, DXGI_PRESENT(0));
    }
  }

  pub fn show(&self) {
    unsafe { let _ = ShowWindow(self.hwnd, SW_SHOW); }
  }

  pub fn hide(&self) {
    unsafe { let _ = ShowWindow(self.hwnd, SW_HIDE); }
  }

  pub fn destroy(self) {
    unsafe { let _ = DestroyWindow(self.hwnd); }
  }
}

fn compile_shader(source: &[u8], entry: &[u8], target: &[u8]) -> std::result::Result<Vec<u8>, String> {
  use windows::Win32::Graphics::Direct3D::Fxc::*;

  unsafe {
    let mut blob: Option<ID3DBlob> = None;
    let mut error_blob: Option<ID3DBlob> = None;

    let hr = D3DCompile(
      source.as_ptr() as *const _,
      source.len(),
      None,
      None,
      None,
      PCSTR(entry.as_ptr()),
      PCSTR(target.as_ptr()),
      0, 0,
      &mut blob,
      Some(&mut error_blob),
    );

    if hr.is_err() {
      if let Some(err) = error_blob {
        let msg = std::slice::from_raw_parts(err.GetBufferPointer() as *const u8, err.GetBufferSize());
        let msg_str = String::from_utf8_lossy(msg);
        return Err(format!("Shader compile error: {}", msg_str));
      }
      return Err("Shader compilation failed".to_string());
    }

    let blob = blob.unwrap();
    let data = std::slice::from_raw_parts(blob.GetBufferPointer() as *const u8, blob.GetBufferSize());
    Ok(data.to_vec())
  }
}
