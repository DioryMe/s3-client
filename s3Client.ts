import {
  S3Client as S3SDKClient,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  S3ServiceException,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { AwsCredentialIdentity } from '@aws-sdk/types'
import { ConnectionClient } from '@diograph/diograph/types'

class S3Client implements ConnectionClient {
  address: string
  keyPrefix: string | null
  bucketName: string
  type: string
  client: S3SDKClient

  constructor(address: string, options?: { region: string; credentials: AwsCredentialIdentity }) {
    if (!address) {
      throw new Error('Please provide address for new S3Client()')
    }

    const { bucketName, keyPrefix } = this.splitAddress(address)
    this.address = address[address.length - 1] === '/' ? address : address + '/'
    this.keyPrefix = keyPrefix
    this.bucketName = bucketName

    this.client = new S3SDKClient(options || { region: 'eu-west-1' })

    this.type = this.constructor.name
  }

  splitAddress = (url: string) => {
    if (!url.startsWith('s3://')) {
      throw new Error(`S3Client address doesn't start with s3:// (${url})`)
    }
    let bucketName, keyPrefix
    // Bucket name
    const addressWithoutS3 = url.split('s3://')[1]
    const splittedAddress = addressWithoutS3.split('/')
    bucketName = splittedAddress[0]
    splittedAddress.shift()
    // Trim last '/'
    if (splittedAddress[splittedAddress.length - 1] == '') {
      splittedAddress.pop()
    }
    // If no keyPrefix
    if (!splittedAddress.length) {
      keyPrefix = null
      return { bucketName, keyPrefix }
    }
    // If keyPrefix
    keyPrefix = splittedAddress.join('/')

    return { bucketName, keyPrefix }
  }

  verify = async () => {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      MaxKeys: 1,
    })
    await this.client.send(command)
    return true
  }

  keyWithPrefix = (key: string) => {
    if (this.keyPrefix) {
      return [this.keyPrefix, key].join('/')
    }
    return key
  }

  readTextItem = async (key: string) => {
    console.log('s3 read text item', this.keyWithPrefix(key))
    const responseBody = await this.getObjectBody(key)

    return responseBody.transformToString()
  }

  readItem = async (key: string) => {
    console.log('s3 read item', this.keyWithPrefix(key))
    const response = await this.getObjectBody(key)

    return this.streamToBuffer(response as ReadableStream)
  }

  readToStream = async (key: string) => {
    console.log('s3 read to stream', this.keyWithPrefix(key))
    const responseBody = await this.getObjectBody(key)

    return responseBody.transformToWebStream() as ReadableStream
  }

  exists = async (key: string) => {
    try {
      const objectParams = {
        Bucket: this.bucketName,
        Key: this.keyWithPrefix(key),
      }

      const headCommand = new HeadObjectCommand(objectParams)
      await this.client.send(headCommand)

      return true
    } catch (err) {
      if (err instanceof S3ServiceException) {
        return false
      }

      console.log('unknown error', err)
      throw err
    }
  }

  writeTextItem = async (key: string, fileContent: string) => {
    console.log('s3 write text item')
    return this.writeItem(key, fileContent)
  }

  writeItem = async (key: string, fileContent: ArrayBuffer | string) => {
    console.log('s3 write item', this.bucketName, this.keyWithPrefix(key))

    const objectParams = {
      Body: fileContent as any,
      Bucket: this.bucketName,
      Key: this.keyWithPrefix(key),
    }

    const putCommand = new PutObjectCommand(objectParams)
    const response = await this.client.send(putCommand)
    return response.$metadata.httpStatusCode == 200
  }

  deleteItem = async (key: string) => {
    console.log('s3 delete item', key)
    const objectParams = {
      Bucket: this.bucketName,
      Key: this.keyWithPrefix(key),
    }
    const deleteCommand = new DeleteObjectCommand(objectParams)
    return this.client.send(deleteCommand).then((response) => {
      return response.$metadata.httpStatusCode == 200
    })
  }

  // based on: https://www.codemzy.com/blog/delete-s3-folder-nodejs
  // - what if key doesn't end with '/'?
  deleteFolder = async (key: string) => {
    const validKey = key[key.length - 1] != '/' ? `${key}/` : key
    const list = await this.deleteList(validKey)
    // Repeat if over 1000 files to be deleted
    let token = list.NextContinuationToken
    while (token) {
      this.deleteList(validKey /*, token */)
      token = list.NextContinuationToken
    }
  }

  deleteList = async (key: string /* , token?: string */) => {
    const list = await this.listCommand(key)
    if (list.KeyCount && list.Contents) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: list.Contents.map((item) => ({ Key: item.Key })),
        },
      })
      let deleted = await this.client.send(deleteCommand)
      // log any errors deleting files
      if (deleted.Errors) {
        deleted.Errors.map((error) =>
          console.log(`${error.Key} could not be deleted - ${error.Code}`),
        )
      }
    }
    return list
  }

  listCommand = async (key: string, token?: string) => {
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: this.keyWithPrefix(key),
      ...(token ? { ContinuationToken: token } : {}),
    })
    const list = await this.client.send(listCommand)
    return list
  }

  // TODO: Unify all the client.list outputs
  // - currently this is S3 specific...
  list = async (key: string) => {
    const list = await this.listCommand(key)
    return list.Contents ? list.Contents.map((c) => JSON.stringify(c)) : []
  }

  // private

  streamToBuffer = async (stream: ReadableStream) => {
    const response = new Response(stream)
    const blob = await response.blob()
    return blob.arrayBuffer()
  }

  getObjectBody = async (key: string) => {
    const objectParams = {
      Bucket: this.bucketName,
      Key: this.keyWithPrefix(key),
    }
    const getCommand = new GetObjectCommand(objectParams)
    const response = await this.client.send(getCommand)

    if (response.$metadata.httpStatusCode != 200 || !response.Body) {
      throw new Error(`Response failed (status: ${response.$metadata}) or didn't contain body`)
    }

    return response.Body
  }
}

export { S3Client }
