import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = resolve('src/api/generated/endpoints/products/products.ts')
const source = readFileSync(target, 'utf8')
const original = 'updateProductOptionValueDto = unref(updateProductOptionValueDto);'
const replacement = 'updateProductOptionValueDto = unref(updateProductOptionValueDto) as UpdateProductOptionValueDto;'

if (!source.includes(original)) {
  throw new Error('Orval weak-body compatibility target was not found; review the generator output before continuing.')
}

writeFileSync(target, source.replace(original, replacement), 'utf8')
console.log('Applied Orval Vue weak-body compatibility fix: UpdateProductOptionValueDto')
