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
        // ─── Content ───
        {
          label: 'Content',
          fields: [
            {
              name: 'subtitle',
              type: 'text',
              admin: { description: 'One evocative line. e.g. "The do-everything longtail that folds to fit in a closet"' },
            },
            {
              name: 'generation',
              type: 'text',
              admin: { description: 'Model generation or year. e.g. "Gen 3", "2026", "V4"' },
            },
            {
              name: 'modelFamily',
              type: 'text',
              admin: { description: 'Groups variants. e.g. "GSD" for GSD S10, GSD R14, GSD P00' },
            },
            {
              name: 'currentlyAvailable',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Uncheck if discontinued or out of stock everywhere' },
            },
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
                features: ({ rootFeatures }) => [
                  ...rootFeatures,
                  HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                ],
              }),
            },
            {
              name: 'testingStatus',
              type: 'select',
              options: [
                { label: 'Tested by Carryish', value: 'tested' },
                { label: 'Based on specs and owner reviews', value: 'specs-only' },
              ],
              defaultValue: 'specs-only',
            },
            {
              name: 'bestFor',
              type: 'array',
              admin: { description: 'Tags like "School runs", "Hilly terrain", "2+ kids"' },
              fields: [{ name: 'tag', type: 'text', required: true }],
            },
            {
              name: 'tagline',
              type: 'text',
              maxLength: 80,
              admin: { description: 'Punchy one-liner, max 80 chars' },
            },
            {
              name: 'oneLiner',
              type: 'text',
              maxLength: 140,
              admin: { description: 'Card/search summary, max 140 chars' },
            },
            {
              name: 'pros',
              type: 'array',
              admin: { description: 'Specific, honest pros (4-6)' },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            {
              name: 'cons',
              type: 'array',
              admin: { description: 'Specific, honest cons (3-5)' },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            {
              name: 'notFor',
              type: 'array',
              admin: { description: 'Who should look elsewhere' },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            {
              name: 'verdict',
              type: 'text',
              admin: { description: 'One sentence bottom line' },
            },
            {
              name: 'comparisonContext',
              type: 'text',
              admin: { description: '1-2 sentences naming closest competitors' },
            },
            {
              name: 'faq',
              type: 'array',
              admin: { description: 'Common buyer questions (3-5)' },
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'textarea', required: true },
              ],
            },
          ],
        },

        // ─── Colors ───
        {
          label: 'Colors',
          fields: [
            {
              name: 'colorOptions',
              type: 'array',
              admin: { description: 'Each color variant with its own hero and 3/4 angle shot.' },
              fields: [
                {
                  name: 'colorName',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. "Beetle Green", "Matte Black"' },
                },
                {
                  name: 'colorHex',
                  type: 'text',
                  admin: { description: 'e.g. "#2D5A3D" — used for swatch display' },
                },
                {
                  name: 'heroImage',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Side-profile on Canvas background (1600×1067)' },
                },
                {
                  name: 'angleImage',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: '3/4 angle shot (1600×1067)' },
                },
              ],
            },
          ],
        },

        // ─── Gallery ───
        {
          label: 'Gallery',
          fields: [
            {
              name: 'gallery',
              type: 'group',
              label: 'Image Gallery',
              fields: [
                {
                  name: 'componentDetails',
                  type: 'array',
                  label: 'Component Detail Shots',
                  admin: { description: 'Close-ups of motor, brakes, display, folding mechanism, rack, etc. (1200×1200)' },
                  fields: [
                    { name: 'image', type: 'upload', relationTo: 'media', required: true },
                    {
                      name: 'component',
                      type: 'select',
                      options: [
                        { label: 'Motor', value: 'motor' },
                        { label: 'Battery', value: 'battery' },
                        { label: 'Display / Controls', value: 'display' },
                        { label: 'Brakes', value: 'brakes' },
                        { label: 'Drivetrain', value: 'drivetrain' },
                        { label: 'Suspension', value: 'suspension' },
                        { label: 'Rack / Cargo', value: 'rack' },
                        { label: 'Kickstand', value: 'kickstand' },
                        { label: 'Lights', value: 'lights' },
                        { label: 'Fold / Storage', value: 'fold' },
                        { label: 'Lock / Security', value: 'lock' },
                        { label: 'Wheels / Tires', value: 'wheels' },
                        { label: 'Cockpit / Handlebars', value: 'cockpit' },
                        { label: 'Seat / Seatpost', value: 'seat' },
                        { label: 'Child Seat / Passenger', value: 'child-seat' },
                        { label: 'Other', value: 'other' },
                      ],
                    },
                    {
                      name: 'caption',
                      type: 'text',
                      admin: { description: 'Short description for alt text and captions' },
                    },
                  ],
                },
                {
                  name: 'lifestyleImages',
                  type: 'array',
                  label: 'Lifestyle / Action Shots',
                  admin: { description: '2-4 real-world photos: kids riding, cargo loaded, city scenes.' },
                  fields: [
                    { name: 'image', type: 'upload', relationTo: 'media', required: true },
                    {
                      name: 'context',
                      type: 'select',
                      options: [
                        { label: 'Kids / Family', value: 'kids' },
                        { label: 'Cargo / Hauling', value: 'cargo' },
                        { label: 'City Commute', value: 'commute' },
                        { label: 'Adventure / Trail', value: 'adventure' },
                        { label: 'Lifestyle', value: 'lifestyle' },
                      ],
                    },
                    { name: 'caption', type: 'text' },
                  ],
                },
              ],
            },
          ],
        },

        // ─── Carryish Scores ───
        {
          label: 'Scores',
          fields: [
            { name: 'overallScore', type: 'number', min: 1, max: 10, admin: { description: 'Overall Carryish score (1-10)' } },
            { name: 'hillScore', type: 'number', min: 1, max: 10, admin: { description: 'Hill performance' } },
            { name: 'cargoScore', type: 'number', min: 1, max: 10, admin: { description: 'Cargo capacity rating' } },
            { name: 'rangeScore', type: 'number', min: 1, max: 10, admin: { description: 'Real-world range rating' } },
            { name: 'valueScore', type: 'number', min: 1, max: 10, admin: { description: 'Price vs capability' } },
            { name: 'familyScore', type: 'number', min: 1, max: 10, admin: { description: 'Family-friendliness' } },
          ],
        },

        // ─── Motor & Power ───
        {
          label: 'Motor & Power',
          fields: [
            { name: 'motorBrand', type: 'text', admin: { description: 'Bosch, Shimano, Bafang, etc.' } },
            {
              name: 'motorPosition',
              type: 'select',
              options: [
                { label: 'Mid-drive', value: 'mid-drive' },
                { label: 'Hub (rear)', value: 'hub-rear' },
                { label: 'Hub (front)', value: 'hub-front' },
              ],
            },
            { name: 'motorNominalWatts', type: 'number', admin: { description: 'Rated watts' } },
            { name: 'motorPeakWatts', type: 'number', admin: { description: 'Peak watts' } },
            { name: 'motorTorqueNm', type: 'number', admin: { description: 'Torque in Nm' } },
            { name: 'pedalAssistLevels', type: 'number' },
            {
              name: 'throttle',
              type: 'select',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Thumb', value: 'thumb' },
                { label: 'Twist', value: 'twist' },
                { label: 'Pedal-activated', value: 'pedal-activated' },
              ],
            },
            { name: 'topSpeedMph', type: 'number' },
            {
              name: 'bikeClass',
              type: 'select',
              options: [
                { label: 'Class 1', value: 'class-1' },
                { label: 'Class 2', value: 'class-2' },
                { label: 'Class 3', value: 'class-3' },
              ],
            },
            // Legacy fields for backward compat
            { name: 'motorType', type: 'text', admin: { description: 'Legacy motor description' } },
          ],
        },

        // ─── Battery & Range ───
        {
          label: 'Battery & Range',
          fields: [
            { name: 'batteryBrand', type: 'text' },
            { name: 'batteryWh', type: 'number' },
            { name: 'batteryVolts', type: 'number' },
            { name: 'batteryRemovable', type: 'checkbox' },
            { name: 'dualBatteryCapable', type: 'checkbox' },
            { name: 'dualBatteryWh', type: 'number', admin: { description: 'Total Wh with both batteries' } },
            { name: 'statedRangeMi', type: 'number', admin: { description: 'Manufacturer range claim (miles)' } },
            { name: 'estimatedRealRangeMi', type: 'number', admin: { description: 'Our estimate with load (miles)' } },
            { name: 'chargeTimeHours', type: 'number' },
            // Legacy
            { name: 'batteryRange', type: 'text', admin: { description: 'Legacy range description' } },
          ],
        },

        // ─── Dimensions & Weight ───
        {
          label: 'Dimensions',
          fields: [
            { name: 'weightLbs', type: 'number' },
            { name: 'maxSystemWeightLbs', type: 'number', admin: { description: 'Total rider + cargo + bike' } },
            { name: 'cargoCapacityLbs', type: 'number', admin: { description: 'Cargo area only (lbs)' } },
            { name: 'lengthInches', type: 'number' },
            { name: 'wheelbaseInches', type: 'number' },
            { name: 'standoverHeightInches', type: 'number' },
            { name: 'riderHeightMin', type: 'text', admin: { description: 'e.g. 5\'1"' } },
            { name: 'riderHeightMax', type: 'text', admin: { description: 'e.g. 6\'5"' } },
            { name: 'foldable', type: 'checkbox' },
            { name: 'fitsInElevator', type: 'checkbox' },
            // Legacy
            { name: 'weight', type: 'text', admin: { description: 'Legacy weight text' } },
            { name: 'cargoCapacity', type: 'text', admin: { description: 'Legacy capacity text' } },
          ],
        },

        // ─── Drivetrain & Brakes ───
        {
          label: 'Drivetrain',
          fields: [
            {
              name: 'drivetrainType',
              type: 'select',
              options: [
                { label: 'Chain', value: 'chain' },
                { label: 'Belt', value: 'belt' },
                { label: 'Shaft', value: 'shaft' },
              ],
            },
            { name: 'drivetrainBrand', type: 'text', admin: { description: 'Shimano, SRAM, Enviolo, Gates' } },
            {
              name: 'gearType',
              type: 'select',
              options: [
                { label: 'Derailleur', value: 'derailleur' },
                { label: 'Internal hub', value: 'internal-hub' },
                { label: 'CVP', value: 'cvp' },
                { label: 'Single speed', value: 'single-speed' },
              ],
            },
            { name: 'numberOfGears', type: 'number' },
            { name: 'brakeBrand', type: 'text' },
            {
              name: 'brakeType',
              type: 'select',
              options: [
                { label: 'Hydraulic disc', value: 'hydraulic-disc' },
                { label: 'Mechanical disc', value: 'mechanical-disc' },
                { label: 'Rim', value: 'rim' },
              ],
            },
            { name: 'brakeRotorSizeMm', type: 'text', admin: { description: 'e.g. 180/203' } },
          ],
        },

        // ─── Wheels & Tires ───
        {
          label: 'Wheels',
          fields: [
            { name: 'frontWheelSize', type: 'text', admin: { description: 'e.g. 20"' } },
            { name: 'rearWheelSize', type: 'text', admin: { description: 'e.g. 20"' } },
            { name: 'tireWidthInches', type: 'number', admin: { description: 'e.g. 2.4' } },
            { name: 'tireBrand', type: 'text' },
            { name: 'punctureProtection', type: 'checkbox' },
          ],
        },

        // ─── Suspension & Comfort ───
        {
          label: 'Comfort',
          fields: [
            {
              name: 'suspensionType',
              type: 'select',
              options: [
                { label: 'Rigid', value: 'rigid' },
                { label: 'Front', value: 'front' },
                { label: 'Full', value: 'full' },
                { label: 'Seatpost', value: 'seatpost' },
              ],
            },
            { name: 'suspensionBrand', type: 'text' },
            {
              name: 'seatpostType',
              type: 'select',
              options: [
                { label: 'Fixed', value: 'fixed' },
                { label: 'Suspension', value: 'suspension' },
                { label: 'Dropper', value: 'dropper' },
              ],
            },
          ],
        },

        // ─── Cargo & Family ───
        {
          label: 'Cargo & Family',
          fields: [
            {
              name: 'cargoLayout',
              type: 'select',
              options: [
                { label: 'Longtail', value: 'longtail' },
                { label: 'Front-box', value: 'front-box' },
                { label: 'Compact', value: 'compact' },
                { label: 'Midtail', value: 'midtail' },
                { label: 'Trike', value: 'trike' },
              ],
            },
            { name: 'maxChildPassengers', type: 'number' },
            { name: 'childSeatCompatibility', type: 'text', admin: { description: 'e.g. Thule Yepp, custom' } },
            { name: 'hasIntegratedChildSeats', type: 'checkbox' },
            { name: 'hasSeatbelts', type: 'checkbox' },
            { name: 'hasFootboards', type: 'checkbox' },
            { name: 'hasWheelGuards', type: 'checkbox' },
            { name: 'hasRainCover', type: 'checkbox' },
            { name: 'rainCoverAvailable', type: 'checkbox' },
            { name: 'frontRack', type: 'checkbox' },
            { name: 'rearRack', type: 'checkbox' },
            { name: 'rackSystem', type: 'text', admin: { description: 'MIK, proprietary, standard' } },
          ],
        },

        // ─── Safety & Security ───
        {
          label: 'Safety',
          fields: [
            { name: 'integratedLights', type: 'checkbox' },
            { name: 'turnSignals', type: 'checkbox' },
            { name: 'absAvailable', type: 'checkbox' },
            { name: 'gpsTracking', type: 'checkbox' },
            { name: 'alarm', type: 'checkbox' },
            { name: 'lockingKickstand', type: 'checkbox' },
            {
              name: 'certifications',
              type: 'array',
              label: 'Safety Certifications',
              admin: { description: 'DIN 79010, UL 2849, EN 15194, etc.' },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'description', type: 'text' },
              ],
            },
          ],
        },

        // ─── Included & Extras ───
        {
          label: 'Extras',
          fields: [
            { name: 'includedAccessories', type: 'textarea', admin: { description: 'What comes in the box' } },
            {
              name: 'keyAccessories',
              type: 'array',
              label: 'Key Accessories',
              admin: { description: 'Named accessories specific to this bike (child seats, panniers, rain covers, etc.)' },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'price', type: 'number', admin: { description: 'Price in USD' } },
                { name: 'description', type: 'text' },
                {
                  name: 'category',
                  type: 'select',
                  options: [
                    { label: 'Child seat', value: 'child-seat' },
                    { label: 'Pannier / Bag', value: 'pannier' },
                    { label: 'Rack', value: 'rack' },
                    { label: 'Rain cover', value: 'rain-cover' },
                    { label: 'Running board / Footpeg', value: 'running-board' },
                    { label: 'Safety rail', value: 'safety-rail' },
                    { label: 'Lock', value: 'lock' },
                    { label: 'Trailer hitch', value: 'trailer-hitch' },
                    { label: 'Battery', value: 'battery' },
                    { label: 'Other', value: 'other' },
                  ],
                },
                { name: 'included', type: 'checkbox', admin: { description: 'Ships with the bike (not a paid add-on)' } },
              ],
            },
            {
              name: 'kickstandType',
              type: 'select',
              options: [
                { label: 'Single', value: 'single' },
                { label: 'Double-leg', value: 'double-leg' },
                { label: 'None', value: 'none' },
              ],
            },
            { name: 'fenders', type: 'checkbox' },
            { name: 'display', type: 'text', admin: { description: 'e.g. Bosch Kiox 500, LCD' } },
          ],
        },

        // ─── Purchase Info ───
        {
          label: 'Purchase',
          fields: [
            { name: 'price', type: 'number', admin: { description: 'MSRP starting price in USD' } },
            { name: 'msrpTo', type: 'number', admin: { description: 'MSRP upper bound (for price ranges)' } },
            { name: 'priceNote', type: 'text', admin: { description: 'e.g. "P10 starts at $5,799; R14 at $9,499"' } },
            {
              name: 'productStatus',
              type: 'select',
              options: [
                { label: 'In Stock', value: 'in-stock' },
                { label: 'Pre-order', value: 'pre-order' },
                { label: 'Discontinued', value: 'discontinued' },
                { label: 'Coming Soon', value: 'coming-soon' },
                { label: 'B2B Only', value: 'b2b-only' },
              ],
              defaultValue: 'in-stock',
            },
            { name: 'streetPriceUsd', type: 'number', admin: { description: 'Common selling price if different' } },
            { name: 'availableIn', type: 'text', admin: { description: 'US, US + EU, Global' } },
            { name: 'warrantyYears', type: 'number' },
            { name: 'warrantyDetails', type: 'text' },
            {
              name: 'salesModel',
              type: 'select',
              options: [
                { label: 'Direct to consumer', value: 'direct-to-consumer' },
                { label: 'Dealer', value: 'dealer' },
                { label: 'Both', value: 'both' },
              ],
            },
            // Price history (future-ready)
            {
              name: 'priceHistory',
              type: 'array',
              admin: { description: 'Price tracking over time' },
              fields: [
                { name: 'date', type: 'date' },
                { name: 'price', type: 'number' },
                { name: 'source', type: 'text' },
              ],
            },
            { name: 'currentBestPrice', type: 'number' },
            { name: 'currentBestPriceSource', type: 'text' },
            { name: 'currentBestPriceUrl', type: 'text' },
            { name: 'onSale', type: 'checkbox' },
            { name: 'saleEndDate', type: 'date' },
          ],
        },

        // ─── Meta ───
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
              name: 'powerType',
              type: 'select',
              options: [
                { label: 'Electric', value: 'electric' },
                { label: 'Non-electric', value: 'non-electric' },
                { label: 'Pedal-assist', value: 'pedal-assist' },
              ],
              defaultValue: 'electric',
              admin: { description: 'Power type — electric is the default' },
            },
            {
              name: 'affiliateUrl',
              type: 'text',
              required: true,
            },
            {
              name: 'variants',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              admin: { description: 'Other variants of the same model (e.g. GSD S10 ↔ GSD R14 ↔ GSD P00)' },
            },
            {
              name: 'directCompetitors',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              admin: { description: 'Direct competitor products (same type, similar price)' },
            },
            {
              name: 'cheaperAlternative',
              type: 'relationship',
              relationTo: 'products',
              admin: { description: 'Best budget alternative' },
            },
            {
              name: 'premiumAlternative',
              type: 'relationship',
              relationTo: 'products',
              admin: { description: 'Step-up premium alternative' },
            },
            {
              name: 'metaTitle',
              type: 'text',
              admin: { description: 'SEO title override' },
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              admin: { description: 'SEO meta description' },
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
    {
      name: 'imageStatus',
      type: 'select',
      options: [
        { label: 'Needs images', value: 'needs-images' },
        { label: 'Has scraped images', value: 'scraped' },
        { label: 'Has editorial images', value: 'editorial' },
        { label: 'Has placeholder', value: 'placeholder' },
      ],
      defaultValue: 'needs-images',
      admin: {
        position: 'sidebar',
        description: 'Image pipeline status',
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
