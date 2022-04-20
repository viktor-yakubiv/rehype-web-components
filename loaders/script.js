import rename from '../lib/rename-component.js'
import resolveName from '../lib/resolve-name.js'

const load = async (modulePath) => {
  const transform = (await import(modulePath)).default
  return transform
}

const createLazy = (modulePath, options = {}) => {
  const nameOptions = Object.assign({ ext: /\.js$/i }, options)
  const name = resolveName(modulePath, nameOptions)
  let component

  const lazyComponent = async function lazyComponent(...args) {
    if (component == null) {
      component = await load(modulePath)
    }

    return component.apply(this, args)
  }

  rename(lazyComponent, name)

  return lazyComponent
}

export default createLazy
