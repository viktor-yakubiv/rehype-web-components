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

const valueTest = /\{(?<name>\w+)\}/

const hasValue = node => {
  const text = [
    ...Object.values(node.properties ?? {}),
    node.value || '',
  ].join('\n')

  return valueTest.test(text)
}

// TODO: Consider using lodash.template instead
//       It has some downsides, it's basically an overkill
const substituteValues = values => shadowTree => {
  const usedValues = new Set()

  const substitude = text => {
    const placeholders = text.match(new RegExp(valueTest, 'g')) ?? []

    const substitutions = placeholders.map(occurance => {
      const { name } = occurance.match(valueTest).groups
      usedValues.add(name)

      const value = Object.hasOwn(values, name)
        ? values[name]
        : occurance

      return [occurance, value]
    })

    // Handles returning null when thee property is set purely to match another
    if (substitutions.length === 1 && text === substitutions[0][0]) {
      return substitutions[0][1]
    }

    return substitutions.reduce(
      (str, [occurance, replacement]) =>
        str.replaceAll(occurance, replacement ?? ''),
      text,
    )

    return result
  }

  visit(shadowTree, hasValue, node => {
    if (node.properties != null) {
      const processedPropEntries = Object.entries(node.properties)
        .map(([propName, propValue]) => {
          // className and some others
          if (Array.isArray(propValue)) {
            return [
              propName,
              propValue.map(substitude).filter(newValue => newValue != null)]
          }

          return [propName, substitude(propValue)]
        })
        .filter(([propName, newValue]) => newValue != null)

      node.properties = Object.fromEntries(processedPropEntries)
    }

    if (node.value != null) {
      node.value = substitude(node.value) ?? ''
    }
  })

  if (shadowTree.children.length === 1) {
    const passProps = Object.fromEntries(
      Object.entries(values)
      .filter(([name, value]) => !usedValues.has(name) && value != null)
    )

    const shadowChild = shadowTree.children[0]
    shadowChild.properties = Object.assign(shadowChild.properties ?? {}, passProps)
  }
}


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
