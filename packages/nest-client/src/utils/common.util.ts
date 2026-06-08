import dayjs from "dayjs";

export function formatTime(time: Date | number | string = new Date()): string {
  return dayjs(time).format("YYYY-MM-DD HH:mm:ss");
}

export function formDateExp(start: dayjs.ConfigType, end: dayjs.ConfigType = new Date()): boolean {
  if (!start || !end) return false;
  return dayjs(end).isAfter(dayjs(start));
}

export interface TimeUtil {
  now: () => number;
  addMs: (ms: number) => number;
  addSec: (s: number) => number;
  addMin: (m: number) => number;
  addHour: (h: number) => number;
  addDay: (d: number) => number;
}

export function timeUtil(): TimeUtil {
  return {
    now: () => Date.now(),
    addMs: (ms: number) => Date.now() + ms,
    addSec: (s: number) => Date.now() + s * 1000,
    addMin: (m: number) => Date.now() + m * 60 * 1000,
    addHour: (h: number) => Date.now() + h * 3600 * 1000,
    addDay: (d: number) => Date.now() + d * 86400 * 1000,
  };
}

/** 下划线转驼峰 */
export function snakeToCamel(str: string): string {
  return str.replace(/_(\w)/g, (_, letter: string) => letter.toUpperCase());
}

/** 驼峰转下划线 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (match: string) => "_" + match.toLowerCase());
}

/** 深度合并对象 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key as keyof T];
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      output[key as keyof T] = deepMerge(target[key] as any, val as any);
    } else {
      output[key as keyof T] = val as any;
    }
  }
  return output;
}
