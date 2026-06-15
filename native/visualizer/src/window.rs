use windows::core::*;
use windows::Win32::Foundation::*;
use windows::Win32::UI::WindowsAndMessaging::*;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::Graphics::Gdi::*;
use std::sync::Once;

static REGISTER_CLASS: Once = Once::new();
const CLASS_NAME: &str = "LxMusicVisualizer";

unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
  match msg {
    WM_ERASEBKGND => LRESULT(1),
    WM_PAINT => {
      let mut ps = PAINTSTRUCT::default();
      let _ = BeginPaint(hwnd, &mut ps);
      let _ = EndPaint(hwnd, &ps);
      LRESULT(0)
    }
    _ => DefWindowProcW(hwnd, msg, wparam, lparam),
  }
}

fn register_class() {
  REGISTER_CLASS.call_once(|| {
    unsafe {
      let hinstance = GetModuleHandleW(None).unwrap();
      let class_name: Vec<u16> = CLASS_NAME.encode_utf16().chain(std::iter::once(0)).collect();
      let wc = WNDCLASSEXW {
        cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
        style: CS_HREDRAW | CS_VREDRAW,
        lpfnWndProc: Some(wnd_proc),
        hInstance: HINSTANCE(hinstance.0),
        hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
        hbrBackground: HBRUSH(GetStockObject(BLACK_BRUSH).0),
        lpszClassName: PCWSTR(class_name.as_ptr()),
        ..Default::default()
      };
      RegisterClassExW(&wc);
    }
  });
}

pub fn create_child_window(parent: isize, x: i32, y: i32, width: i32, height: i32) -> std::result::Result<HWND, String> {
  register_class();

  unsafe {
    let hinstance = GetModuleHandleW(None).map_err(|e| e.to_string())?;
    let class_name: Vec<u16> = CLASS_NAME.encode_utf16().chain(std::iter::once(0)).collect();

    let hwnd = CreateWindowExW(
      WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_NOACTIVATE,
      PCWSTR(class_name.as_ptr()),
      PCWSTR::null(),
      WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS,
      x, y, width, height,
      HWND(parent as *mut _),
      None,
      HINSTANCE(hinstance.0),
      None,
    ).map_err(|e| e.to_string())?;

    SetLayeredWindowAttributes(hwnd, COLORREF(0), 0, LWA_COLORKEY)
      .map_err(|e| e.to_string())?;

    Ok(hwnd)
  }
}
