import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface ProgramAudio {
    id: string;
    title: string;
    duration: number;
    type: string;
    listenCount?: number;
    url: string;
    coverUrl?: string;
}

interface ProgramDTO {
    id: string;
    name: string;
    description: string;
    audios: ProgramAudio[];
}

export default function TrainingScreen() {
    const [programs, setPrograms] = useState<ProgramDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [currentAudio, setCurrentAudio] = useState<ProgramAudio | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [favorites, setFavorites] = useState<string[]>([]);
    const soundRef = useRef<Audio.Sound | null>(null);
    const sessionStartRef = useRef(0);

    useEffect(() => {
        Promise.all([
            apiClient.get<ProgramDTO[]>('/programs'),
            apiClient.get<string[]>('/users/me/favorites'),
        ]).then(([p, f]) => {
            setPrograms(p);
            setFavorites(f);
            setLoading(false);
        }).catch(() => setLoading(false));

        // Setup audio mode for background playback
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
        });

        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    const playAudio = async (audio: ProgramAudio) => {
        // Unload previous
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
        }

        const { sound } = await Audio.Sound.createAsync(
            { uri: audio.url },
            { shouldPlay: true },
            onPlaybackStatusUpdate,
        );

        soundRef.current = sound;
        setCurrentAudio(audio);
        setIsPlaying(true);
        sessionStartRef.current = Date.now();
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis / 1000);
        setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
        setIsPlaying(status.isPlaying);

        if (status.didJustFinish) {
            // Send completed heartbeat
            const sessionDur = (Date.now() - sessionStartRef.current) / 1000;
            if (currentAudio) {
                apiClient.post('/analytics/heartbeat', {
                    audioId: currentAudio.id,
                    position: status.positionMillis / 1000,
                    sessionDuration: sessionDur,
                    completed: true,
                });
            }
            setIsPlaying(false);
        }
    };

    const togglePlayPause = async () => {
        if (!soundRef.current) return;
        if (isPlaying) {
            await soundRef.current.pauseAsync();
            // Send pause heartbeat
            const sessionDur = (Date.now() - sessionStartRef.current) / 1000;
            if (currentAudio && sessionDur >= 2) {
                apiClient.post('/analytics/heartbeat', {
                    audioId: currentAudio.id,
                    position,
                    sessionDuration: sessionDur,
                    completed: false,
                });
            }
        } else {
            sessionStartRef.current = Date.now();
            await soundRef.current.playAsync();
        }
    };

    const toggleFavorite = async (audioId: string) => {
        const isFav = favorites.includes(audioId);
        const result = await apiClient.put<string[]>('/users/me/favorites', {
            audioId,
            isFavorite: !isFav,
        });
        setFavorites(result);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return <Loader />;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.pageTitle}>Mes Programmes</Text>

                {programs.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun programme ne vous a été affecté pour le moment.</Text>
                ) : (
                    programs.map((prog) => {
                        const isExpanded = expandedId === prog.id;
                        return (
                            <View key={prog.id} style={styles.programCard}>
                                <TouchableOpacity
                                    style={[styles.programHeader, isExpanded && styles.programHeaderActive]}
                                    onPress={() => setExpandedId(isExpanded ? null : prog.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.programInfo}>
                                        <Ionicons name="play-circle" size={24} color={Colors.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.programName} numberOfLines={1}>{prog.name}</Text>
                                            <Text style={styles.programMeta}>
                                                {prog.audios?.length || 0} audios{prog.description ? ` · ${prog.description}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={Colors.textMuted}
                                    />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.audioList}>
                                        {prog.audios?.map((audio) => (
                                            <TouchableOpacity
                                                key={audio.id}
                                                style={[
                                                    styles.audioItem,
                                                    currentAudio?.id === audio.id && styles.audioItemActive,
                                                ]}
                                                onPress={() => playAudio(audio)}
                                                activeOpacity={0.7}
                                            >
                                                {audio.coverUrl ? (
                                                    <Image
                                                        source={{ uri: audio.coverUrl }}
                                                        style={styles.audioCover}
                                                    />
                                                ) : (
                                                    <View style={[styles.audioCover, styles.audioCoverPlaceholder]}>
                                                        <Ionicons name="musical-note" size={16} color={Colors.textMuted} />
                                                    </View>
                                                )}
                                                <View style={styles.audioInfo}>
                                                    <Text style={styles.audioTitle} numberOfLines={1}>{audio.title}</Text>
                                                    <Text style={styles.audioMeta}>
                                                        {Math.round(audio.duration / 60)} min · {audio.type}
                                                    </Text>
                                                </View>
                                                <Text style={styles.listenCount}>{audio.listenCount || 0} écoutes</Text>
                                                <TouchableOpacity
                                                    onPress={() => toggleFavorite(audio.id)}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Ionicons
                                                        name={favorites.includes(audio.id) ? 'heart' : 'heart-outline'}
                                                        size={20}
                                                        color={favorites.includes(audio.id) ? Colors.danger : Colors.textMuted}
                                                    />
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Mini Player */}
            {currentAudio && (
                <View style={styles.miniPlayer}>
                    <View style={styles.miniProgressBg}>
                        <View style={[styles.miniProgressFill, { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }]} />
                    </View>
                    <View style={styles.miniPlayerContent}>
                        <View style={styles.miniPlayerInfo}>
                            <Text style={styles.miniPlayerTitle} numberOfLines={1}>{currentAudio.title}</Text>
                            <Text style={styles.miniPlayerTime}>
                                {formatTime(position)} / {formatTime(duration)}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={togglePlayPause} style={styles.miniPlayerBtn}>
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={28}
                                color={Colors.white}
                            />
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
    pageTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xxl,
        marginTop: Spacing.lg,
    },
    emptyText: { color: Colors.textMuted, fontSize: FontSizes.md, textAlign: 'center', marginTop: 40 },
    programCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    programHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    programHeaderActive: {
        backgroundColor: Colors.bgInput,
    },
    programInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    programName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '600' },
    programMeta: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
    audioList: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    audioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.md,
    },
    audioItemActive: {
        backgroundColor: Colors.bgInput,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    audioCover: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.sm,
    },
    audioCoverPlaceholder: {
        backgroundColor: Colors.bgInput,
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioInfo: { flex: 1 },
    audioTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    audioMeta: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
    listenCount: { color: Colors.textMuted, fontSize: FontSizes.xs, marginRight: Spacing.sm },
    miniPlayer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.bgElevated,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        ...Shadows.lg,
    },
    miniProgressBg: {
        height: 3,
        backgroundColor: Colors.bgInput,
    },
    miniProgressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    miniPlayerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
        gap: Spacing.md,
    },
    miniPlayerInfo: { flex: 1 },
    miniPlayerTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    miniPlayerTime: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
    miniPlayerBtn: {
        backgroundColor: Colors.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
