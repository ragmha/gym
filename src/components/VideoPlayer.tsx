import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import {
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { WebView } from 'react-native-webview'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

/** Extract the YouTube video ID from a URL */
function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  return match?.[1] ?? null
}

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
  }, [translateX])

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

export default function VideoPlayer({ uri }: { uri: string }) {
  const [isLoading, setIsLoading] = useState(true)
  const [embedFailed, setEmbedFailed] = useState(false)
  const videoId = extractVideoId(uri)

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&controls=1&playsinline=1`
    : null
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null

  if (!videoId) return null

  // Fallback: thumbnail + tap to watch in YouTube
  if (embedFailed || Platform.OS === 'web') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => Linking.openURL(uri)}
        style={styles.container}
      >
        <View style={styles.videoWrapper}>
          {thumbnailUrl && (
            <Image
              source={{ uri: thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoWrapper}>
        {isLoading && <VideoSkeleton />}
        <WebView
          source={{ uri: embedUrl! }}
          style={[styles.video, { opacity: isLoading ? 0 : 1 }]}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={false}
          onLoadEnd={() => setIsLoading(false)}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 400) setEmbedFailed(true)
          }}
          onError={() => setEmbedFailed(true)}
          injectedJavaScript={`
            (function() {
              var check = setInterval(function() {
                var err = document.querySelector('.ytp-error');
                if (err) {
                  window.ReactNativeWebView.postMessage('EMBED_ERROR');
                  clearInterval(check);
                }
              }, 500);
              setTimeout(function() { clearInterval(check); }, 8000);
            })();
            true;
          `}
          onMessage={(e) => {
            if (e.nativeEvent.data === 'EMBED_ERROR') setEmbedFailed(true)
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 22,
    marginLeft: 3,
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
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
