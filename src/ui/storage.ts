export function readText(key: string, fallback: string) {
  try {
    const value = localStorage.getItem(`sehals-room:v2:${key}`);
    return value?.slice(0, 20000) ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveText(key: string, text: string) {
  try {
    localStorage.setItem(`sehals-room:v2:${key}`, text.slice(0, 20000));
    return true;
  } catch {
    return false;
  }
}
