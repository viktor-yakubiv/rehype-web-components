import clone from 'lodash.clonedeep'
import merge from 'lodash.merge'

const attach = ({
  tree: templateTree,
  file: templateFile,
  clone: shouldClone = false,
  name,
}) => (hostTree, hostFile) => {
  const hostData = hostTree.data ?? {}

  Object.assign(hostTree, shouldClone ? clone(templateTree) : templateTree)

  hostTree.data = merge(hostData, templateTree.data)

  Object.assign(hostFile.data, {
    components: Object.assign(hostFile.data?.components ?? {}, {
      [name ?? hostTree.tagName]: templateFile,
    }),
  })
}

export default attach
