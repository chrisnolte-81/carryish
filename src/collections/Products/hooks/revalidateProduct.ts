import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Product } from '../../../payload-types'

export const revalidateProduct: CollectionAfterChangeHook<Product> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = `/bikes/${doc.slug}`

      payload.logger.info(`Revalidating product at path: ${path}`)

      revalidatePath(path)
      revalidatePath('/bikes')
      revalidateTag('products-sitemap', 'max')
    }

    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/bikes/${previousDoc.slug}`

      payload.logger.info(`Revalidating old product at path: ${oldPath}`)

      revalidatePath(oldPath)
      revalidatePath('/bikes')
      revalidateTag('products-sitemap', 'max')
    }
  }
  return doc
}

export const revalidateDeleteProduct: CollectionAfterDeleteHook<Product> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/bikes/${doc?.slug}`

    revalidatePath(path)
    revalidatePath('/bikes')
    revalidateTag('products-sitemap', 'max')
  }

  return doc
}
