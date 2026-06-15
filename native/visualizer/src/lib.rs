mod window;
mod d3d11;
mod smoothing;

use napi::bindgen_prelude::*;
use napi_derive::napi;
use parking_lot::Mutex;
use std::sync::Arc;

struct VisualizerState {
  renderer: d3d11::D3D11Renderer,
  smoother: smoothing::Smoother,
  color: [f32; 3],
  settings: VisualizerSettings,
}

unsafe impl Send for VisualizerState {}
unsafe impl Sync for VisualizerState {}

static VISUALIZER: once_cell::sync::Lazy<Arc<Mutex<Option<VisualizerState>>>> =
  once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

#[derive(Clone)]
struct VisualizerSettings {
  smoothing: f32,
  height_scale: f32,
  opacity: f32,
  amplitude_scale: f32,
  show_bars: bool,
  show_wave: bool,
  use_log_scale: bool,
  bar_count: u32,
  bar_width: f32,
  center_mirror: bool,
}

impl Default for VisualizerSettings {
  fn default() -> Self {
    Self {
      smoothing: 0.8,
      height_scale: 0.7,
      opacity: 0.3,
      amplitude_scale: 1.0,
      show_bars: true,
      show_wave: false,
      use_log_scale: true,
      bar_count: 128,
      bar_width: 0.0,
      center_mirror: false,
    }
  }
}

#[napi(object)]
pub struct JsVisualizerSettings {
  pub smoothing: f64,
  pub height_scale: f64,
  pub opacity: f64,
  pub amplitude_scale: f64,
  pub show_bars: bool,
  pub show_wave: bool,
  pub use_log_scale: bool,
  pub bar_count: u32,
  pub bar_width: f64,
  pub center_mirror: bool,
}

#[napi]
pub fn create(parent_hwnd: i64, x: i32, y: i32, width: i32, height: i32) -> Result<bool> {
  let hwnd = window::create_child_window(parent_hwnd as isize, x, y, width, height)
    .map_err(|e| Error::from_reason(format!("Failed to create window: {}", e)))?;

  let renderer = d3d11::D3D11Renderer::new(hwnd, width as u32, height as u32)
    .map_err(|e| Error::from_reason(format!("Failed to init D3D11: {}", e)))?;

  let mut state = VISUALIZER.lock();
  *state = Some(VisualizerState {
    renderer,
    smoother: smoothing::Smoother::new(128),
    color: [0.47, 0.7, 0.55],
    settings: VisualizerSettings::default(),
  });

  Ok(true)
}

#[napi]
pub fn update_frame(data: Buffer) -> Result<()> {
  let mut state = VISUALIZER.lock();
  let state = state.as_mut().ok_or_else(|| Error::from_reason("Not initialized"))?;

  let freq_data: &[u8] = data.as_ref();
  let settings = &state.settings;

  state.smoother.update(freq_data, settings.bar_count, settings.use_log_scale,
    settings.smoothing, settings.amplitude_scale);

  let bars = state.smoother.bars();
  let color = state.color;
  let opacity = settings.opacity;
  let height_scale = settings.height_scale;
  let bar_width = settings.bar_width;
  let center_mirror = settings.center_mirror;
  let show_bars = settings.show_bars;
  let show_wave = settings.show_wave;
  state.renderer.render(bars, &color, opacity,
    height_scale, bar_width, center_mirror,
    show_bars, show_wave);

  Ok(())
}

#[napi]
pub fn set_color(r: f64, g: f64, b: f64) {
  let mut state = VISUALIZER.lock();
  if let Some(s) = state.as_mut() {
    s.color = [r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0];
  }
}

#[napi]
pub fn set_settings(settings: JsVisualizerSettings) {
  let mut state = VISUALIZER.lock();
  if let Some(s) = state.as_mut() {
    let new_bar_count = settings.bar_count;
    s.settings = VisualizerSettings {
      smoothing: settings.smoothing as f32 / 100.0,
      height_scale: settings.height_scale as f32 / 100.0,
      opacity: settings.opacity as f32 / 100.0,
      amplitude_scale: settings.amplitude_scale as f32 / 100.0,
      show_bars: settings.show_bars,
      show_wave: settings.show_wave,
      use_log_scale: settings.use_log_scale,
      bar_count: new_bar_count,
      bar_width: settings.bar_width as f32,
      center_mirror: settings.center_mirror,
    };
    if s.smoother.bar_count() != new_bar_count {
      s.smoother = smoothing::Smoother::new(new_bar_count);
    }
  }
}

#[napi]
pub fn resize(x: i32, y: i32, width: i32, height: i32) -> Result<()> {
  let mut state = VISUALIZER.lock();
  let state = state.as_mut().ok_or_else(|| Error::from_reason("Not initialized"))?;
  state.renderer.resize(x, y, width as u32, height as u32)
    .map_err(|e| Error::from_reason(format!("Resize failed: {}", e)))?;
  Ok(())
}

#[napi]
pub fn destroy() {
  let mut state = VISUALIZER.lock();
  if let Some(s) = state.take() {
    s.renderer.destroy();
  }
}

#[napi]
pub fn show() {
  let state = VISUALIZER.lock();
  if let Some(s) = state.as_ref() {
    s.renderer.show();
  }
}

#[napi]
pub fn hide() {
  let state = VISUALIZER.lock();
  if let Some(s) = state.as_ref() {
    s.renderer.hide();
  }
}
