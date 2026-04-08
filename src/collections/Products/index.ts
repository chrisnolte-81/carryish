import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { revalidateProduct, revalidateDeleteProduct } from './hooks/revalidateProduct'
import { slugField } from 'payload'

export const Products: CollectionConfig<'products'> = {
  slug: 'products',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'brand', 'category', 'price', 'updatedAt'],
    useAsTitle: 'name',
  },
  defaultPopulate: {
    name: true,
    slug: true,
    brand: true,
    category: true,
    price: true,
    images: true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'images',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
            },
            {
              name: 'carryishTake',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                  ]
                },
              }),
            },
          ],
        },
        {
          label: 'Specs',
          fields: [
            {
              name: 'price',
              type: 'number',
            },
            {
              name: 'weight',
              type: 'text',
            },
            {
              name: 'cargoCapacity',
              type: 'text',
            },
            {
              name: 'motorType',
              type: 'text',
            },
            {
              name: 'batteryRange',
              type: 'text',
            },
          ],
        },
        {
          label: 'Meta',
          fields: [
            {
              name: 'brand',
              type: 'relationship',
              relationTo: 'brands',
            },
            {
              name: 'category',
              type: 'select',
              options: [
                { label: 'Cargo Bike', value: 'cargo-bike' },
                { label: 'Stroller', value: 'stroller' },
                { label: 'Trailer', value: 'trailer' },
                { label: 'Wagon', value: 'wagon' },
                { label: 'Accessory', value: 'accessory' },
              ],
            },
            {
              name: 'affiliateUrl',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidateProduct],
    afterDelete: [revalidateDeleteProduct],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
