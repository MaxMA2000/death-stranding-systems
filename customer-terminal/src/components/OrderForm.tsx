'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import CustomDropdown from './CustomDropdown'

export default function OrderForm() {
  const t = useTranslations('orderForm')
  const tPlaceholders = useTranslations('placeholders')
  const tKnotCities = useTranslations('knotCities')

  const [formData, setFormData] = useState({
    senderName: '',
    senderLocation: '',
    senderKnotCity: '',
    senderLat: '',
    senderLng: '',
    recipientName: '',
    recipientLocation: '',
    recipientKnotCity: '',
    recipientLat: '',
    recipientLng: '',
    itemName: '',
    itemWeight: '',
    itemDescription: '',
    itemCategory: '',
    pickupMethod: '',
    paymentInfo: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [orderId, setOrderId] = useState<string>('')

  // Dropdown options data
  const categoryKeys = ['Standard', 'Fragile', 'Medical', 'Emergency', 'Hazardous']
  const pickupMethodKeys = ['Standard Pickup', 'Express Pickup', 'Scheduled Pickup']
  const knotCityKeys = ['capital', 'port', 'lake', 'south', 'mountain', 'edge']

  // Transform data for custom dropdown component
  const categoryOptions = categoryKeys.map(key => ({
    value: key,
    label: t(`cargo.categories.${key}`)
  }))

  const pickupMethodOptions = pickupMethodKeys.map(key => ({
    value: key,
    label: t(`delivery.pickupMethods.${key}`)
  }))

  const knotCityOptions = knotCityKeys.map(key => ({
    value: key,
    label: tKnotCities(key)
  }))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDropdownChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Get the actual city names for API submission
      const getSenderCityName = () => {
        const cityOption = knotCityOptions.find(option => option.value === formData.senderKnotCity)
        return cityOption ? cityOption.label : formData.senderKnotCity
      }

      const getRecipientCityName = () => {
        const cityOption = knotCityOptions.find(option => option.value === formData.recipientKnotCity)
        return cityOption ? cityOption.label : formData.recipientKnotCity
      }

      const orderData = {
        sender: {
          name: formData.senderName,
          location: formData.senderLocation,
          knot_city: getSenderCityName(),
          coordinates: {
            lat: parseFloat(formData.senderLat) || 39.9042,
            lng: parseFloat(formData.senderLng) || 116.4074
          }
        },
        recipient: {
          name: formData.recipientName,
          location: formData.recipientLocation,
          knot_city: getRecipientCityName(),
          coordinates: {
            lat: parseFloat(formData.recipientLat) || 39.9142,
            lng: parseFloat(formData.recipientLng) || 116.4174
          }
        },
        item: {
          name: formData.itemName,
          description: formData.itemDescription,
          weight: parseFloat(formData.itemWeight),
          category: formData.itemCategory
        },
        pickup_method: formData.pickupMethod,
        payment_info: formData.paymentInfo
      }

      const response = await fetch('http://localhost:8081/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        const result = await response.json()
        setSubmitStatus('success')
        setOrderId(result.id)
        // Reset form
        setFormData({
          senderName: '',
          senderLocation: '',
          senderKnotCity: '',
          senderLat: '',
          senderLng: '',
          recipientName: '',
          recipientLocation: '',
          recipientKnotCity: '',
          recipientLat: '',
          recipientLng: '',
          itemName: '',
          itemWeight: '',
          itemDescription: '',
          itemCategory: '',
          pickupMethod: '',
          paymentInfo: ''
        })
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error submitting order:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-mono text-blue-300 tracking-wider mb-2">
            {t('title')}
          </h2>
          <p className="text-blue-400/80 font-mono text-sm">
            {t('subtitle')}
          </p>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
            <p className="text-green-400 font-mono text-sm">
              {t('success', { orderId })}
            </p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 font-mono text-sm">
              {t('error')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sender Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-mono text-blue-300 border-b border-blue-500/20 pb-2">
              {t('sender.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('sender.name')}
                </label>
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterName')}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('sender.location')}
                </label>
                <input
                  type="text"
                  name="senderLocation"
                  value={formData.senderLocation}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterLocation')}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <CustomDropdown
                  options={knotCityOptions}
                  value={formData.senderKnotCity}
                  onChange={(value) => handleDropdownChange('senderKnotCity', value)}
                  placeholder={tPlaceholders('selectKnotCity')}
                  label={t('sender.knotCity')}
                  name="senderKnotCity"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="senderLat"
                  value={formData.senderLat}
                  onChange={handleInputChange}
                  placeholder="39.9042"
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="senderLng"
                  value={formData.senderLng}
                  onChange={handleInputChange}
                  placeholder="116.4074"
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Recipient Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-mono text-blue-300 border-b border-blue-500/20 pb-2">
              {t('recipient.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('recipient.name')}
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterName')}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('recipient.location')}
                </label>
                <input
                  type="text"
                  name="recipientLocation"
                  value={formData.recipientLocation}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterLocation')}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <CustomDropdown
                  options={knotCityOptions}
                  value={formData.recipientKnotCity}
                  onChange={(value) => handleDropdownChange('recipientKnotCity', value)}
                  placeholder={tPlaceholders('selectKnotCity')}
                  label={t('recipient.knotCity')}
                  name="recipientKnotCity"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="recipientLat"
                  value={formData.recipientLat}
                  onChange={handleInputChange}
                  placeholder="39.9142"
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="recipientLng"
                  value={formData.recipientLng}
                  onChange={handleInputChange}
                  placeholder="116.4174"
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Cargo Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-mono text-blue-300 border-b border-blue-500/20 pb-2">
              {t('cargo.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('cargo.name')}
                </label>
                <input
                  type="text"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterItemName')}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('cargo.weight')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="itemWeight"
                  value={formData.itemWeight}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterWeight')}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('cargo.description')}
                </label>
                <textarea
                  name="itemDescription"
                  value={formData.itemDescription}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterDescription')}
                  rows={3}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
              <div>
                <CustomDropdown
                  options={categoryOptions}
                  value={formData.itemCategory}
                  onChange={(value) => handleDropdownChange('itemCategory', value)}
                  placeholder={tPlaceholders('selectCategory')}
                  label={t('cargo.category')}
                  name="itemCategory"
                  required
                />
              </div>
            </div>
          </div>

          {/* Delivery Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-mono text-blue-300 border-b border-blue-500/20 pb-2">
              {t('delivery.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CustomDropdown
                  options={pickupMethodOptions}
                  value={formData.pickupMethod}
                  onChange={(value) => handleDropdownChange('pickupMethod', value)}
                  placeholder={tPlaceholders('selectPickup')}
                  label={t('delivery.pickup')}
                  name="pickupMethod"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-200 font-mono text-sm mb-2">
                  {t('delivery.payment')}
                </label>
                <input
                  type="text"
                  name="paymentInfo"
                  value={formData.paymentInfo}
                  onChange={handleInputChange}
                  placeholder={tPlaceholders('enterPayment')}
                  className="w-full bg-gray-700 border border-blue-500/30 rounded px-4 py-2 text-blue-100 font-mono focus:outline-none focus:border-blue-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-mono py-3 px-6 rounded-lg transition-colors"
            >
              {isSubmitting ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 