import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import type { Program, AudioTrack, UserProfile, ProgramShare } from '../../types';

export default function AdminProgramsScreen() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [selectedAudioIds, setSelectedAudioIds] = useState<string[]>([]);
    const [shareModalProgram, setShareModalProgram] = useState<Program | null>(null);
    const [shareUserId, setShareUserId] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [p, a, u] = await Promise.all([
                apiClient.get<Program[]>('/programs'),
                apiClient.get<AudioTrack[]>('/audios'),
                apiClient.get<UserProfile[]>('/users'),
            ]);
            setPrograms(p);
            setAudios(a);
            setUsers(u.filter(usr => usr.role === 'ATHLETE'));
            setLoading(false);
        } catch { setLoading(false); }
    };

    const toggleAudio = (id: string) => {
        setSelectedAudioIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreate = async () => {
        if (!name) return;
        try {
            await apiClient.post('/programs', { name, description: desc, audioIds: selectedAudioIds });
            await fetchData();
            setShowCreate(false);
            setName(''); setDesc(''); setSelectedAudioIds([]);
        } catch (e: any) { Alert.alert('Erreur', e.message); }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Supprimer', 'Êtes-vous sûr ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: async () => {
                await apiClient.delete(`/programs/${id}`);
                await fetchData();
            }},
        ]);
    };

    const handleShare = async () => {
        if (!shareModalProgram || !shareUserId) return;
        try {
            await apiClient.post(`/programs/${shareModalProgram.id}/share`, { userId: shareUserId });
            Alert.alert('Partagé !');
            setShareModalProgram(null);
            setShareUserId('');
        } catch (e: any) { Alert.alert('Erreur', e.message); }
    };

    if (loading) return <Loader />;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.pageTitle}>Programmes</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
                        <Ionicons name="add" size={24} color={Colors.white} />
                    </TouchableOpacity>
                </View>

                {programs.map((prog) => (
                    <View key={prog.id} style={styles.programCard}>
                        <View style={styles.programInfo}>
                            <Text style={styles.programName}>{prog.name}</Text>
                            <Text style={styles.programMeta}>{prog.audios?.length || 0} audios</Text>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => setShareModalProgram(prog)}>
                                <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(prog.id)}>
                                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Create Modal */}
            <Modal visible={showCreate} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nouveau programme</Text>
                        <TextInput style={styles.input} placeholder="Nom" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
                        <TextInput style={[styles.input, { height: 60 }]} placeholder="Description" placeholderTextColor={Colors.textMuted} multiline value={desc} onChangeText={setDesc} />

                        <Text style={styles.subLabel}>Sélectionner des audios</Text>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {audios.map((a) => (
                                <TouchableOpacity key={a.id} style={styles.audioRow} onPress={() => toggleAudio(a.id)}>
                                    <Ionicons
                                        name={selectedAudioIds.includes(a.id) ? 'checkbox' : 'square-outline'}
                                        size={20}
                                        color={selectedAudioIds.includes(a.id) ? Colors.primary : Colors.textMuted}
                                    />
                                    <Text style={styles.audioRowText} numberOfLines={1}>{a.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                                <Text style={styles.cancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                                <Text style={styles.saveText}>Créer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Share Modal */}
            <Modal visible={!!shareModalProgram} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Partager « {shareModalProgram?.name} »</Text>
                        <Text style={styles.subLabel}>Sélectionner un athlète</Text>
                        <ScrollView style={{ maxHeight: 250 }}>
                            {users.map((u) => (
                                <TouchableOpacity
                                    key={u.id}
                                    style={[styles.athleteRow, shareUserId === u.id && styles.athleteRowActive]}
                                    onPress={() => setShareUserId(u.id)}
                                >
                                    <Text style={styles.athleteRowText}>{u.firstName} {u.lastName}</Text>
                                    {shareUserId === u.id && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShareModalProgram(null)}>
                                <Text style={styles.cancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleShare}>
                                <Text style={styles.saveText}>Partager</Text>
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
    addBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    programCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, padding: Spacing.lg,
        marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    },
    programInfo: { flex: 1 },
    programName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    programMeta: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
    actions: { flexDirection: 'row', gap: Spacing.lg },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xxl },
    modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
    input: {
        backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, padding: Spacing.lg,
        color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    subLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.sm },
    audioRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
    audioRowText: { color: Colors.text, fontSize: FontSizes.md, flex: 1 },
    athleteRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    athleteRowActive: { backgroundColor: Colors.primaryLight },
    athleteRowText: { color: Colors.text, fontSize: FontSizes.md },
    modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
    cancelBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.bgInput },
    cancelText: { color: Colors.textMuted, fontSize: FontSizes.md, fontWeight: '600' },
    saveBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
    saveText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
});
