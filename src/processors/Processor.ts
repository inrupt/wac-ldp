export default interface Processor {
  process (task: any): Promise<any>
}
