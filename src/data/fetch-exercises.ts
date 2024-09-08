import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

const accessKeyId =
  process.env.AWS_ACCESS_KEY_ID || process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY ||
  process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY
const region = process.env.AWS_REGION || process.env.EXPO_PUBLIC_AWS_REGION
const bucketName =
  process.env.AWS_BUCKET_NAME || process.env.EXPO_PUBLIC_AWS_BUCKET_NAME

export const fetchExercies = async () => {
  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Missing AWS environment variables')
  }

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: 'exercises.json',
  })

  try {
    const response = await s3.send(command)
    const body = await response.Body?.transformToString()

    if (!body) {
      throw new Error('No body returned from S3')
    }

    return JSON.parse(body)
  } catch (err) {
    console.error(`Error fetching from S3: ${err}`)
  }
}
