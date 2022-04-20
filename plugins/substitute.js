import { visitParents as visit } from 'unist-util-visit-parents'

const unifyQuery = (value, fallback) => {
  if (value === false) return 'none'
  if (value === true) return 'root'
  if (['none', 'root'].includes(value)) return value
  if (typeof fallback != 'undefined') return fallback

  throw new Error(`Context query can be only boolean, 'none', 'closest' or 'root' but got ${value}`)
}

const attach = ({
  values: globalContext,
  context: contextQuery = 'none',
  missing: missingValueFlag = 'omit', // 'keep' or 'throw'
  interpolate = /\$\{([\s\S]+?)\}/,
} = {}) => {
  if (unifyQuery(contextQuery) === 'none' && globalContext == null) {
    throw new Error('You must pass values when context inferring is disabled')
  }

  const localFlags = interpolate.flags.replace('g', '')
  const globalFlags = localFlags + 'g'

  const searcher = new RegExp(interpolate, globalFlags)
  const extractor = new RegExp(interpolate, localFlags)

  const hasValue = node => searcher.test([...Object.values(node.properties ?? {}), node.value ?? ''].join(' '))

  const transform = (tree, file) => {
    const usedValues = new Set()

    const context = unifyQuery(contextQuery) === 'none'
      ? globalContext
      : tree.data.values

    const substitude = text => {
      const placeholders = text.match(searcher) ?? []

      const substitutions = placeholders.map(occurance => {
        const name = occurance.match(extractor)[1]
        usedValues.add(name)

        if (!Object.hasOwn(context, name) && missingValueFlag === 'throw') {
          file.fail(`${name} is missing in the values context`)
        }

        const value = Object.hasOwn(context, name) || missingValueFlag === 'omit'
          ? context[name]
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
    }

    visit(tree, hasValue, node => {
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

    tree.data = Object.assign(tree.data ?? {}, {
      substituted: [...usedValues],
    })
  }

  return transform
}

export default attach


// if (tree.children.length === 1) {
//       const passProps = Object.fromEntries(
//         Object.entries(context)
//           .filter(([name, value]) => !usedValues.has(name) && value != null),
//       )
//
//       const shadowChild = tree.children[0]
//       shadowChild.properties = Object.assign(shadowChild.properties ?? {}, passProps)
//     }
