import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useSignIn } from '@/hooks/useSignIn';
import { getUserMessage } from '@/utils/errors';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useSignIn();

  const handleSubmit = () => {
    if (!email.trim() || !password) return;
    signIn.mutate({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <Box className="flex-1 items-center justify-center bg-background p-8">
        <Box className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
          <VStack space="xl">
            <VStack space="sm">
              <Heading size="2xl" bold className="text-foreground">
                Tarihi İznik Fırını
              </Heading>
              <Text size="sm" className="text-muted-foreground">
                Devam etmek için giriş yapın.
              </Text>
            </VStack>

            <VStack space="md">
              <VStack space="xs">
                <Text size="sm" className="text-muted-foreground">
                  E-posta
                </Text>
                <Input>
                  <InputField
                    placeholder="ornek@iznikfirini.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text size="sm" className="text-muted-foreground">
                  Şifre
                </Text>
                <Input>
                  <InputField
                    placeholder="••••••••"
                    secureTextEntry
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={handleSubmit}
                  />
                </Input>
              </VStack>

              {signIn.isError ? (
                <Text size="sm" className="text-destructive">
                  {getUserMessage(signIn.error)}
                </Text>
              ) : null}
            </VStack>

            <Button
              onPress={handleSubmit}
              disabled={signIn.isPending || !email.trim() || !password}
              size="lg"
            >
              {signIn.isPending ? <ButtonSpinner /> : null}
              <ButtonText>Giriş Yap</ButtonText>
            </Button>
          </VStack>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
}
