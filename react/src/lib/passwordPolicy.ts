export function passwordError(password: string): string {
  const value = password.normalize("NFC");
  if ([...value].length < 15) return "Use at least 15 characters. Spaces and symbols are welcome.";
  if ([...value].length > 1024 || new TextEncoder().encode(value).length > 4096) return "Password is too long (maximum 1024 characters).";
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (new Set(["password", "password123", "password1234", "password12345", "password123456789", "123456789012345", "1234567890123456", "qwertyuiopasdfgh", "iloveyou12345678", "letmein123456789", "gradeup123456789", "correcthorsebatterystaple", "abcdefghijklmnop", "adminadminadmin", "welcome123456789", "passw0rdpassw0rd"]).has(compact) || /^(.)\1{14,}$/u.test(value) || /^(1234567890|qwerty){2,}/i.test(value)) {
    return "This password is too common or predictable. Choose a different one.";
  }
  return "";
}

export function passwordStrength(password: string): "Weak" | "Moderate" | "Strong" {
  const value = password.normalize("NFC");
  const unique = new Set([...value]).size;
  if (value.length >= 24 && unique >= 12) return "Strong";
  if (value.length >= 15 && unique >= 8) return "Moderate";
  return "Weak";
}
