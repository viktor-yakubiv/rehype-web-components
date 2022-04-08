import { toVFile } from 'to-vfile'
import Component from './component.js'

const load = async (modulePath) => {
  const transform = (await import(modulePath)).default
  return transform
}

class ScriptComponent extends Component {
  constructor(options) {
    super(options)
    this.file = toVFile(options)
  }

  async load() {
    if (this.transform != null) return
    this.transform = await load(this.file.path)
  }

  async render(hostTree, ancestors) {
    await this.load()
    return this.transform(hostTree, ancestors)
  }
}

export default ScriptComponent
