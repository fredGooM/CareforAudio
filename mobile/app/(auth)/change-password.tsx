import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

export default function ChangePasswordScreen() {
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const { changePassword } = useAuth();
    const router = useRouter();

    const handleSubmit = async () => {
        if (newPwd !== confirmPwd) {
            Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
            return;
        }
        setLoading(true);
        const result = await changePassword(currentPwd, newPwd);
        setLoading(false);
        if (result.success) {
            Alert.alert('Succès', 'Mot de passe changé');
            router.replace('/');
        } else {
            Alert.alert('Erreur', result.error || 'Erreur');
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.card}>
                <Text style={styles.title}>Changer le mot de passe</Text>
                <TextInput style={styles.input} placeholder="Mot de passe actuel" placeholderTextColor={Colors.textMuted} secureTextEntry value={currentPwd} onChangeText={setCurrentPwd} />
                <TextInput style={styles.input} placeholder="Nouveau mot de passe" placeholderTextColor={Colors.textMuted} secureTextEntry value={newPwd} onChangeText={setNewPwd} />
                <TextInput style={styles.input} placeholder="Confirmer le nouveau mot de passe" placeholderTextColor={Colors.textMuted} secureTextEntry value={confirmPwd} onChangeText={setConfirmPwd} />
                <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? 'Chargement...' : 'Changer'}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, padding: Spacing.xl },
    card: { width: '100%', maxWidth: 400, backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl, padding: Spacing.xxxl, ...Shadows.lg, borderWidth: 1, borderColor: Colors.border },
    title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xxl, textAlign: 'center' },
    input: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
    button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.md },
    buttonText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
});
