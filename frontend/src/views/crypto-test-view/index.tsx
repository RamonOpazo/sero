import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  encryptPasswordSecurely, 
  isWebCryptoSupported,
  getCryptoStats,
  type EncryptedPassword 
} from '@/lib/crypto'

/**
 * Development component to test RSA encryption functionality
 * This should be removed in production builds
 */
export function CryptoTestView() {
  const [testPassword, setTestPassword] = useState('test123')
  const [loading, setLoading] = useState(false)
  const [encryptedData, setEncryptedData] = useState<EncryptedPassword | null>(null)
  const [cryptoStats, setCryptoStats] = useState<any>(null)

  const webCryptoSupported = isWebCryptoSupported()

  const handleTestEncryption = async () => {
    if (!testPassword.trim()) {
      toast.error('Please enter a test password')
      return
    }

    setLoading(true)
    try {
      console.log('🧪 Testing RSA encryption with password:', testPassword)
      
      const encrypted = await encryptPasswordSecurely(testPassword)
      setEncryptedData(encrypted)
      
      toast.success('Password encrypted successfully!', {
        description: `Key ID: ${encrypted.keyId.substring(0, 8)}...`
      })
      
      // Get updated crypto stats
      const stats = await getCryptoStats()
      setCryptoStats(stats)
      
    } catch (error) {
      console.error('❌ Encryption test failed:', error)
      toast.error('Encryption test failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGetStats = async () => {
    try {
      const stats = await getCryptoStats()
      setCryptoStats(stats)
      toast.success('Crypto stats retrieved')
    } catch (error) {
      toast.error('Failed to get crypto stats', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (!webCryptoSupported) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-destructive">⚠️ Web Crypto Not Supported</CardTitle>
          <CardDescription>
            Your browser does not support the Web Crypto API required for secure password encryption.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔐 RSA Crypto Test</CardTitle>
        <CardDescription>
          Test the RSA encryption functionality with ephemeral keys
        </CardDescription>
        <Badge variant="outline" className="w-fit">
          Web Crypto API: ✅ Supported
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Test Input */}
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="Enter test password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestEncryption()}
          />
          <Button 
            onClick={handleTestEncryption} 
            disabled={loading || !testPassword.trim()}
          >
            {loading ? 'Encrypting...' : 'Test Encrypt'}
          </Button>
        </div>

        {/* Encrypted Result */}
        {encryptedData && (
          <div className="space-y-2 p-3 bg-muted rounded-md">
            <h4 className="font-medium text-sm">Encryption Result:</h4>
            <div className="text-xs space-y-1">
              <p><strong>Key ID:</strong> {encryptedData.keyId}</p>
              <p><strong>Encrypted Length:</strong> {encryptedData.encryptedPassword.length} chars</p>
              <p><strong>Encrypted Data:</strong> {encryptedData.encryptedPassword.substring(0, 60)}...</p>
            </div>
          </div>
        )}

        {/* Crypto Stats */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGetStats}>
            Get Crypto Stats
          </Button>
        </div>

        {cryptoStats && (
          <div className="space-y-2 p-3 bg-muted rounded-md">
            <h4 className="font-medium text-sm">Backend Crypto Stats:</h4>
            <div className="text-xs space-y-1">
              <p><strong>Active Keys:</strong> {cryptoStats.active_ephemeral_keys}</p>
              <p><strong>Algorithm:</strong> {cryptoStats.algorithm}</p>
              <p><strong>Key TTL:</strong> {cryptoStats.key_ttl_seconds}s</p>
              {cryptoStats.key_ids?.length > 0 && (
                <p><strong>Key IDs:</strong> {cryptoStats.key_ids.join(', ')}</p>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          💡 This component is for development testing only. Each encryption request generates a fresh RSA key pair on the backend.
        </div>
      </CardContent>
    </Card>
  )
}
