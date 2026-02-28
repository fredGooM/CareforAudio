import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async () => {
        if (!email || !password) return;
        setError('');
        setLoading(true);

        const result = await login(email, password);
        setLoading(false);

        if (!result.success) {
            setError(result.error || 'Erreur');
        } else if (result.mustChangePassword) {
            router.replace('/(auth)/change-password');
        } else {
            router.replace('/');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>Careformance Audio</Text>
                    <Text style={styles.subtitle}>Connectez-vous à votre espace</Text>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="admin@careformance.com"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Mot de passe</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textMuted}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={styles.buttonText}>Se connecter</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bg,
        padding: Spacing.xl,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxxl,
        ...Shadows.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxxl,
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSizes.md,
        color: Colors.textMuted,
    },
    errorBox: {
        backgroundColor: Colors.dangerLight,
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    errorText: {
        color: Colors.danger,
        fontSize: FontSizes.sm,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.bgInput,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        color: Colors.text,
        fontSize: FontSizes.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.white,
        fontSize: FontSizes.md,
        fontWeight: '700',
    },
});
