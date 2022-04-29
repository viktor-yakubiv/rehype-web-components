import castArray from 'lodash.castarray'
import { visitParents as visit } from 'unist-util-visit-parents'
import { isElement } from 'hast-util-is-element'
import fragment from '../utils/fragment.js'
import { defaultSlotName } from './parse-slots.js'

const hasSlotsData = node => node.data?.slots != null

const isSlot = node => isElement(node, 'slot')

const unifyQuery = (value, fallback) => {
  if (value === false) return 'none'
  if (value === true) return 'closest'
  if (['none', 'closest', 'root'].includes(value)) return value
  if (typeof fallback != 'undefined') return fallback

  throw new Error(`Context query can be only boolean, 'none', 'closest' or 'root' but got ${value}`)
}

const findContext = (ancestors, query, fallback = {}) => {
  query = unifyQuery(query)

  if (query === 'none') return fallback
  if (query === 'root') return ancestors[0].data?.slots ?? fallback
  return ancestors.findLast(node => hasSlotsData(node))?.data?.slots ?? fallback
}

const attach = ({
  values: globalContext,
  context: contextQuery = 'none',
}) => {
  if (unifyQuery(contextQuery) === 'none' && globalContext == null) {
    throw new Error('You must pass values when context inferring is disabled')
  }

  const transform = tree => {
    visit(tree, isSlot, (node, ancestors) => {
      const allAncestors = [...ancestors, tree]

      const name = node.properties.name ?? defaultSlotName
      const context = findContext(allAncestors, contextQuery, globalContext)
      const value = castArray(context[name] ?? node.children ?? [])

      Object.assign(node, fragment(node, value))
    })
  }

  return transform
}

export default attach
