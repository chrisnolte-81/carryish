import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const UserReviews: CollectionConfig = {
  slug: 'user-reviews',
  access: {
    create: () => true,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'authorName',
    defaultColumns: ['authorName', 'product', 'rating', 'status'],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    { name: 'authorName', type: 'text', required: true },
    { name: 'rating', type: 'number', min: 1, max: 5, required: true },
    {
      name: 'ownershipDuration',
      type: 'select',
      options: [
        { label: 'Under 1 month', value: 'under-1-month' },
        { label: '1-6 months', value: '1-6-months' },
        { label: '6-12 months', value: '6-12-months' },
        { label: '1+ year', value: '1-year-plus' },
      ],
    },
    {
      name: 'useCase',
      type: 'select',
      options: [
        { label: 'School run', value: 'school-run' },
        { label: 'Commute', value: 'commute' },
        { label: 'Errands', value: 'errands' },
        { label: 'Business', value: 'business' },
        { label: 'Recreation', value: 'recreation' },
      ],
    },
    { name: 'pros', type: 'textarea' },
    { name: 'cons', type: 'textarea' },
    {
      name: 'body',
      type: 'richText',
      editor: lexicalEditor({}),
    },
    { name: 'verified', type: 'checkbox', defaultValue: false },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
  ],
}
