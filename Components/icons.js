import React from 'react'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

export function Icon({ name, size = 20, color }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />
}