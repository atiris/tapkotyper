declare module 'potrace' {
  interface Options { turdSize?: number; alphaMax?: number; optTolerance?: number; threshold?: number }
  const potrace: { trace(file: Buffer, options: Options, done: (err: Error | null, svg: string) => void): void };
  export default potrace;
}
