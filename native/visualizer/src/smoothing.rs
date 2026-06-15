pub struct Smoother {
  bars: Vec<Bar>,
  mapped: Vec<f32>,
  count: u32,
}

#[derive(Clone, Copy)]
pub struct Bar {
  pub value: f32,
  pub peak: f32,
  pub peak_v: f32,
}

impl Default for Bar {
  fn default() -> Self {
    Self { value: 0.0, peak: 0.0, peak_v: 0.0 }
  }
}

impl Smoother {
  pub fn new(bar_count: u32) -> Self {
    Self {
      bars: vec![Bar::default(); bar_count as usize],
      mapped: vec![0.0; bar_count as usize],
      count: bar_count,
    }
  }

  pub fn bar_count(&self) -> u32 {
    self.count
  }

  pub fn bars(&self) -> &[Bar] {
    &self.bars
  }

  pub fn update(&mut self, freq_data: &[u8], bar_count: u32, use_log: bool, smoothing: f32, amp: f32) {
    if self.count != bar_count {
      self.count = bar_count;
      self.bars = vec![Bar::default(); bar_count as usize];
      self.mapped = vec![0.0; bar_count as usize];
    }

    let num = bar_count as usize;
    self.map_frequency(freq_data, num, use_log);
    let freq_avg = self.calc_frequency_avg(freq_data);

    let rise = 0.3 + (1.0 - smoothing) * 0.55;
    let fall = 0.04 + (1.0 - smoothing) * 0.1;

    for i in 0..num {
      let raw = self.mapped[i] / 255.0;
      let boosted = raw * freq_avg + raw * 0.42;
      let target = boosted.min(1.0) * amp;

      let b = &mut self.bars[i];
      let factor = if target > b.value { rise } else { fall };
      b.value += (target - b.value) * factor;

      if b.value > b.peak {
        b.peak = b.value;
        b.peak_v = 0.0;
      } else {
        b.peak_v += 0.001;
        b.peak = (b.peak - b.peak_v).max(0.0);
      }
    }
  }

  fn map_frequency(&mut self, data: &[u8], num_bars: usize, use_log: bool) {
    let len = data.len();
    let usable = 16usize.max(len * 45 / 100);

    for i in 0..num_bars {
      let t = i as f32 / num_bars as f32;
      let bin_pos = if use_log {
        t.powf(0.55) * usable as f32
      } else {
        t * usable as f32
      };
      let lo = (bin_pos as usize).min(usable - 1);
      let hi = (lo + 1).min(usable - 1);
      let frac = bin_pos - lo as f32;
      let v_lo = data.get(lo).copied().unwrap_or(0) as f32;
      let v_hi = data.get(hi).copied().unwrap_or(0) as f32;
      self.mapped[i] = v_lo * (1.0 - frac) + v_hi * frac;
    }
  }

  fn calc_frequency_avg(&self, data: &[u8]) -> f32 {
    let len = data.len();
    let usable = 16usize.max(len * 45 / 100);
    let step = if usable > 2048 { usable / 1024 } else { 1 };
    let mut avg = 0.0f32;
    let mut count = 0u32;
    let mut i = 0;
    while i < usable {
      let v = data[i] as f32;
      if v > 5.0 { avg += v * 1.2; }
      count += 1;
      i += step;
    }
    avg /= count as f32;
    avg *= 1.4;
    avg / 255.0
  }
}
