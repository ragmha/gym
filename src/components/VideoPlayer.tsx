import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

export default function VideoPlayer({
  uri,
  autoPlay,
}: {
  uri: string
  autoPlay?: boolean
}) {
  const videoUri = `${uri}?autoplay=${autoPlay ? 1 : 0}&fs=0`

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <iframe
          width="100%"
          height="100%"
          src={videoUri}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: videoUri }}
        style={styles.video}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  webContainer: {
    height: 800,
    paddingBottom: 20,
  },
  container: {
    height: 300,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  video: {
    flex: 1,
  },
})
