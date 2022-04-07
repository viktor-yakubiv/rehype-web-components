import clone from 'lodash.clonedeep'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

const DEFAULT_SLOT = Symbol('default')

const trim = nodeList => {
  const test = ({ type, value }) => type === 'element' || !/^\s*$/gi.test(value)
  const start = nodeList.findIndex(test)
  // findIndexLast is missing
  const end = (nodeList.length - 1) - [...nodeList].reverse().findIndex(test)
  return nodeList.slice(start, end + 1)
}

/**
 * Slots
 */

const isSlot = node => node.tagName === 'slot'

const collectSlots = hostTree =>
  (hostTree.children ?? []).reduce((slots, child) => {
    const name = child.properties?.slot ?? DEFAULT_SLOT
    if (!slots.has(name)) slots.set(name, [])
    slots.get(name).push(child)
    return slots
  }, new Map())

const substituteSlots = slots => shadowTree =>
  visit(shadowTree, isSlot, (slotNode, index, parent) => {
    const name = slotNode.properties?.name ?? DEFAULT_SLOT
    const replacement = slots.get(name) ?? slotNode.children ?? []
    parent.children.splice(index, 1, ...replacement)
  })

/**
 * Values
 */

const valueTest = /\{\s*(?<name>\w+)\s*\}/

const hasValue = node => {
  const text = [
    ...Object.values(node.properties ?? {}),
    node.value || '',
  ].join('\n')

  return valueTest.test(text)
}

// TODO: Consider using lodash.template instead
//       It has some downsides, it's basically an overkill
// TODO: Find an appropriate name for this function
const substituteTemplateString = (text, values) => {
  const placeholders = text.match(new RegExp(valueTest, 'g')) ?? []

  const substitutions = placeholders.map(occurance => {
    const { name } = occurance.match(valueTest).groups

    // TODO: Consider removing props if null explicitly passed
    //       This might be a rare case as this requires JS,
    //       i.e. HTML itself does not offer any option to pass not a string
    const value = Object.hasOwn(values, name)
      ? values[name] ?? ''
      : occurance

    return [occurance, value]
  })

  return substitutions.reduce((str, [occurance, replacement]) =>
    str.replace(new RegExp(occurance, 'g'), replacement), text)
}

const substituteValues = values => shadowTree =>
  visit(shadowTree, hasValue, node => {
    if (node.properties != null) {
      const processedPropEntries = Object.entries(node.properties)
        // className is an array, inconvenient to process
        .filter(([name]) => name !== 'className')
        .map(([name, propValue]) => [
          name,
          substituteTemplateString(propValue, values),
        ])

      Object.assign(node.properties, Object.fromEntries(processedPropEntries))
    }

    if (node.value != null) {
      node.value = substituteTemplateString(node.value, values)
    }
  })


/**
 * API class
 */

const appendPosition = position => tree => Object.assign(tree, { position })

class Template {
  constructor(nodes) {
    this.tree = {
      type: 'root',
      tagName: 'template',
      children: trim(nodes),
    }
  }

  render(hostTree) {
    const shadowTree = clone(this.tree)
    const slots = collectSlots(hostTree)
    const properties = hostTree.properties ?? {}

    return unified()
      .use(substituteSlots, slots)
      .use(substituteValues, properties)
      .use(appendPosition, hostTree.position)
      .run(shadowTree)
  }
}

export default Template
