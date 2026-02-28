import React, { useEffect, useState, FormEvent } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Modal, Switch, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import type { AudioTrack, Category, Group, UserProfile } from '../../types';

export default function AdminLibraryScreen() {
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [editAudio, setEditAudio] = useState<AudioTrack | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPublished, setEditPublished] = useState(false);

    useEffect(() => {
        Promise.all([
            apiClient.get<AudioTrack[]>('/audios'),
            apiClient.get<Category[]>('/categories'),
        ]).then(([a, c]) => {
            setAudios(a);
            setCategories(c);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const openEdit = (audio: AudioTrack) => {
        setEditAudio(audio);
        setEditTitle(audio.title);
        setEditDesc(audio.description || '');
        setEditPublished(audio.published);
        setShowEdit(true);
    };

    const handleSave = async () => {
        if (!editAudio) return;
        try {
            await apiClient.put(`/audios/${editAudio.id}`, {
                title: editTitle,
                description: editDesc,
                published: editPublished,
            });
            const updated = await apiClient.get<AudioTrack[]>('/audios');
            setAudios(updated);
            setShowEdit(false);
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert('Supprimer', 'Êtes-vous sûr ?', [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Supprimer', style: 'destructive', onPress: async () => {
                    await apiClient.delete(`/audios/${id}`);
                    setAudios(prev => prev.filter(a => a.id !== id));
                }
            },
        ]);
    };

    if (loading) return <Loader />;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.pageTitle}>Bibliothèque Audio</Text>

                {audios.map((audio) => (
                    <View key={audio.id} style={styles.audioCard}>
                        <Image source={{ uri: audio.coverUrl }} style={styles.cover} />
                        <View style={styles.audioInfo}>
                            <Text style={styles.audioTitle} numberOfLines={1}>{audio.title}</Text>
                            <Text style={styles.audioMeta}>
                                {Math.round(audio.duration / 60)} min · {audio.type}
                            </Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusBadge, { backgroundColor: audio.published ? Colors.successLight : Colors.dangerLight }]}>
                                    <Text style={{ color: audio.published ? Colors.success : Colors.danger, fontSize: FontSizes.xs, fontWeight: '600' }}>
                                        {audio.published ? 'Publié' : 'Brouillon'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => openEdit(audio)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="create-outline" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(audio.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Edit Modal */}
            <Modal visible={showEdit} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Modifier l'audio</Text>
                        <TextInput
                            style={styles.input}
                            value={editTitle}
                            onChangeText={setEditTitle}
                            placeholder="Titre"
                            placeholderTextColor={Colors.textMuted}
                        />
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            value={editDesc}
                            onChangeText={setEditDesc}
                            placeholder="Description"
                            placeholderTextColor={Colors.textMuted}
                            multiline
                        />
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Publié</Text>
                            <Switch
                                value={editPublished}
                                onValueChange={setEditPublished}
                                trackColor={{ false: Colors.bgInput, true: Colors.primaryLight }}
                                thumbColor={editPublished ? Colors.primary : Colors.textMuted}
                            />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}>
                                <Text style={styles.cancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveText}>Sauvegarder</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: 100 },
    pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    audioCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, padding: Spacing.md,
        marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    },
    cover: { width: 56, height: 56, borderRadius: BorderRadius.sm, backgroundColor: Colors.bgInput },
    audioInfo: { flex: 1 },
    audioTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    audioMeta: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
    statusRow: { flexDirection: 'row', marginTop: Spacing.xs },
    statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 1 },
    actions: { gap: Spacing.md },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xxl },
    modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
    input: {
        backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, padding: Spacing.lg,
        color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
    switchLabel: { color: Colors.text, fontSize: FontSizes.md },
    modalActions: { flexDirection: 'row', gap: Spacing.md },
    cancelBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.bgInput },
    cancelText: { color: Colors.textMuted, fontSize: FontSizes.md, fontWeight: '600' },
    saveBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
    saveText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
});
