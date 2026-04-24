import { AudioDominance, AudioPhasing } from '@/types';

export const AUDIO_CATEGORIES = [
    'Non spécifié',
    'Performance',
    'Sommeil',
    'Activation',
    'Compétition',
    'Concentration',
    'Récupération',
    'Confiance',
    'Gestion du stress',
    'Blessure',
    'Motivation',
] as const;

export const DOMINANCE_LABELS: Record<AudioDominance, string> = {
    [AudioDominance.UNSPECIFIED]: 'Non spécifié',
    [AudioDominance.MIND]: 'Pensée',
    [AudioDominance.BODY]: 'Corps',
    [AudioDominance.EMOTION]: 'Émotion',
};

export const PHASING_LABELS: Record<AudioPhasing, string> = {
    [AudioPhasing.UNSPECIFIED]: 'Non spécifié',
    [AudioPhasing.PRE_COMPETITION]: 'Précompétition',
    [AudioPhasing.DURING_COMPETITION]: 'Pendant',
    [AudioPhasing.POST_COMPETITION]: 'Post compétition',
};
