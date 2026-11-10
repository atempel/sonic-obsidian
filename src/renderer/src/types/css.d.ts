/** Folhas de estilo importadas pelo Vite (efeito colateral). */
declare module '*.css'

/** Worker do Vite embutido como blob (`?worker&inline`): CSP `worker-src blob:`. */
declare module '*?worker&inline' {
  const WorkerCtor: new () => Worker
  export default WorkerCtor
}
