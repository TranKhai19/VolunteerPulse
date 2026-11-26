export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " đ";
}

export function formatMillions(amount: number): string {
  return (amount / 1_000_000).toFixed(1) + " tr";
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}
