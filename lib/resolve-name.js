import path from 'path'

const resolveName = (filePath, options = {}) => {
  const { prefix = '', ext = '', name } = options

  if (name != null) {
    return name
  }

  const basename = path.basename(filePath)
  return [prefix, ext ? basename.replace(ext, '') : basename].join('')
}

export default resolveName
