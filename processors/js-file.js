import path from 'path'
import clone from 'lodash.clonedeep'

const load = async (modulePath) => {
  const transform = (await import(path.resolve(modulePath))).default
  return transform
}

export default load
