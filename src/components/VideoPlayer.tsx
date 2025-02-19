import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { Platform, StyleSheet, View, useColorScheme } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { WebView } from 'react-native-webview'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

function VideoSkeleton() {
  const translateX = useSharedValue(-300)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  React.useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(-300, { duration: 0 }),
        withTiming(300, { duration: 1500 }),
      ),
      -1,
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <View
      style={[
        styles.skeletonContainer,
        isDark ? styles.skeletonDark : styles.skeletonLight,
      ]}
    >
      {/* Thumbnail area with 16:9 aspect ratio */}
      <View style={styles.thumbnailArea}>
        <View style={styles.thumbnailContent} />
      </View>

      <AnimatedLinearGradient
        style={[styles.shimmer, animatedStyle]}
        colors={
          isDark
            ? [
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.05)',
                'rgba(255,255,255,0)',
              ]
            : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </View>
  )
}

export default function VideoPlayer({
  uri,
  autoPlay,
}: {
  uri: string
  autoPlay?: boolean
}) {
  const [isLoading, setIsLoading] = useState(true)
  const videoUri = `${uri}?autoplay=${autoPlay ? 1 : 0}&fs=0`

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.videoWrapper}>
          {isLoading && <VideoSkeleton />}
          <iframe
            width="100%"
            height="100%"
            src={videoUri}
            allow="autoplay; encrypted-media"
            allowFullScreen={false}
            onLoad={() => setIsLoading(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: isLoading ? 0 : 1,
            }}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoWrapper}>
        {isLoading && <VideoSkeleton />}
        <WebView
          source={{ uri: videoUri }}
          style={[
            styles.video,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: isLoading ? 0 : 1,
            },
          ]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={false}
          onLoadEnd={() => setIsLoading(false)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  skeletonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  skeletonDark: {
    backgroundColor: '#0f0f0f',
  },
  skeletonLight: {
    backgroundColor: '#ffffff',
  },
  thumbnailArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  thumbnailContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#282828',
  },
  infoArea: {
    padding: 12,
    gap: 12,
  },
  titleBar: {
    height: 20,
    width: '70%',
    borderRadius: 4,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  channelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  channelText: {
    flex: 1,
    gap: 8,
  },
  channelName: {
    height: 14,
    width: '40%',
    borderRadius: 4,
  },
  videoStats: {
    height: 14,
    width: '30%',
    borderRadius: 4,
  },
  elementDark: {
    backgroundColor: '#282828',
  },
  elementLight: {
    backgroundColor: '#e6e6e6',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
