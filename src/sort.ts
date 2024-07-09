import { MappingItem } from "yaml-unist-parser"

const getKey = ({ children: [keyItem] }: MappingItem) => {
    if (keyItem.children[0]?.type !== 'plain') return ''
    return keyItem.children[0].value
}

const PRIORITIES = ["version", "includes", "vars", "env", "tasks"]

const assortItems = (items: MappingItem[]) => {
    return items.reduce<{
        targets: MappingItem[], others: {
            index: number
            item: MappingItem
        }[]
    }>((prev, curr) => {
        const [keyItem] = curr.children
        const index = items.findIndex(ele => ele === curr)
        if (!keyItem) {
            return {
                targets: prev.targets,
                others: [...prev.others, { index, item: curr }]
            }
        }
        if (PRIORITIES.includes(getKey(curr))) {
            return {
                targets: [...prev.targets, curr],
                others: prev.others,
            }
        }
        return {
            targets: prev.targets,
            others: [...prev.others, { index, item: curr }]
        }

    }, { targets: [], others: [] })
}

const merge = (targets: MappingItem[], others: {
    index: number,
    item: MappingItem,
}[]) => {
    const result = [...targets]
    others.forEach(other => {
        result.splice(other.index, 0, other.item)
    })
    return result
}

const compareKeys = (a: MappingItem, b: MappingItem) => {
    return PRIORITIES.findIndex((ele) => ele === getKey(a)) - PRIORITIES.findIndex((ele) => ele === getKey(b))
}

export const sort = (mappingItems: MappingItem[]) => {
    // 1. ソートする要素とソートしない要素に仕分ける
    const { targets, others } = assortItems(mappingItems)
    // 2. ソートする要素はソートする
    targets.sort(compareKeys)
    // 3. ソートした要素とソートしない要素をマージする
    return merge(targets, others)
}
