import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import type { AudioTrack } from '../../types';

export default function FavoritesScreen() {
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loading, setLoading] = useState(true);
    const soundRef = useRef<Audio.Sound | null>(null);
    const sessionStartRef = useRef(0);

    useEffect(() => {
        apiClient.get<AudioTrack[]>('/audios/favorites').then((data) => {
            setAudios(data);
            setLoading(false);
        }).catch(() => setLoading(false));

        return () => { soundRef.current?.unloadAsync(); };
    }, []);

    const playAudio = async (audio: AudioTrack) => {
        if (soundRef.current) await soundRef.current.unloadAsync();

        const { sound } = await Audio.Sound.createAsync(
            { uri: audio.url },
            { shouldPlay: true },
            (status: any) => {
                if (!status.isLoaded) return;
                setPosition(status.positionMillis / 1000);
                setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
                setIsPlaying(status.isPlaying);

                if (status.didJustFinish) {
                    const sessionDur = (Date.now() - sessionStartRef.current) / 1000;
                    apiClient.post('/analytics/heartbeat', {
                        audioId: audio.id,
                        position: status.positionMillis / 1000,
                        sessionDuration: sessionDur,
                        completed: true,
                    });
                    setIsPlaying(false);
                }
            },
        );

        soundRef.current = sound;
        setCurrentAudio(audio);
        setIsPlaying(true);
        sessionStartRef.current = Date.now();
    };

    const togglePlayPause = async () => {
        if (!soundRef.current) return;
        if (isPlaying) {
            await soundRef.current.pauseAsync();
        } else {
            sessionStartRef.current = Date.now();
            await soundRef.current.playAsync();
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (loading) return <Loader />;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.pageTitle}>Mes Favoris</Text>

                {audios.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun favori pour le moment.</Text>
                ) : (
                    <View style={styles.grid}>
                        {audios.map((audio) => (
                            <TouchableOpacity
                                key={audio.id}
                                style={[styles.audioCard, currentAudio?.id === audio.id && styles.audioCardActive]}
                                onPress={() => playAudio(audio)}
                                activeOpacity={0.8}
                            >
                                <Image source={{ uri: audio.coverUrl }} style={styles.cover} />
                                <Text style={styles.audioTitle} numberOfLines={1}>{audio.title}</Text>
                                <Text style={styles.audioMeta}>{Math.round(audio.duration / 60)} min</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {currentAudio && (
                <View style={styles.miniPlayer}>
                    <View style={styles.miniProgressBg}>
                        <View style={[styles.miniProgressFill, { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }]} />
                    </View>
                    <View style={styles.miniPlayerContent}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniPlayerTitle} numberOfLines={1}>{currentAudio.title}</Text>
                            <Text style={styles.miniPlayerTime}>{formatTime(position)} / {formatTime(duration)}</Text>
                        </View>
                        <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: 160 },
    pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    emptyText: { color: Colors.textMuted, fontSize: FontSizes.md, textAlign: 'center', marginTop: 40 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    audioCard: {
        width: '47%',
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    audioCardActive: { borderColor: Colors.primary },
    cover: { width: '100%', aspectRatio: 1, backgroundColor: Colors.bgInput },
    audioTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', padding: Spacing.sm, paddingBottom: 2 },
    audioMeta: { color: Colors.textMuted, fontSize: FontSizes.sm, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
    miniPlayer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.bgElevated, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadows.lg,
    },
    miniProgressBg: { height: 3, backgroundColor: Colors.bgInput },
    miniProgressFill: { height: '100%', backgroundColor: Colors.primary },
    miniPlayerContent: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
    miniPlayerTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    miniPlayerTime: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
    playBtn: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
