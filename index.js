import castArray from 'lodash.castarray'
import { is } from 'unist-util-is'
import { visitParents as visit, SKIP } from 'unist-util-visit-parents'
import { isElement } from 'hast-util-is-element'
import indexComponents from './lib/index-components.js'
import fragment from './utils/fragment.js'
import defragment from './utils/defragment.js'
import normalize from './utils/normalize.js'

const attach = ({
  fragments: keepFragments = false,
  ...indexerOptions
} = {}) => async (tree, file) => {
  const componentsIndex = await indexComponents(indexerOptions)

  const isRegisteredComponent = node => isElement(node) &&
    componentsIndex.has(node.tagName)

  const transform = async (subtree, subtreeParent) => {
    const asyncUpdates = []

    visit(subtree, isRegisteredComponent, (node, ancestors) => {
      const parent = ancestors[ancestors.length - 1] ?? subtreeParent
      const component = componentsIndex.get(node.tagName)

      const update = component.call(null, node, file)

        // a component could modify the tree in place and return nothing
        // or could return a fragment 'root' node or a regular one
        // in any case it is converted to fragment and passed down
        .then(result => {
          const fragmentBase = result == null || !is(result, 'root')
            ? node
            : result
          const fragmentChildren = fragmentBase === result
            ? fragmentBase.children
            : result ?? node.children

          const nextSubtree = fragment(fragmentBase, castArray(fragmentChildren))
          return transform(nextSubtree, parent)
        })

        // for some reason `transform()` does not return tree 🤔
        .then(result => {
          const transformedSubtree = result == null ? node : result
          const nodeList = castArray(transformedSubtree)

          // the index must be searched just before replacing
          // because of unpredictable asynchronous list shifts
          const index = parent.children.indexOf(node)
          parent.children.splice(index, 1, ...nodeList)

          return nodeList
        })

      asyncUpdates.push(update)
      return SKIP
    })

    await Promise.all(asyncUpdates)
    return subtree
  }

  await transform(tree)

  if (!keepFragments) {
    defragment(tree)
  }

  normalize(tree)
}

export default attach
