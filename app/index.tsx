import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 52;
const MAX_HOURS = 23;

function formatTwo(value: number) {
  return value.toString().padStart(2, '0');
}

type WheelPickerProps = {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
};

function WheelPicker({ label, value, max, onChange }: WheelPickerProps) {
  const numbers = useMemo(() => Array.from({ length: max + 1 }, (_, i) => i), [max]);
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: value * ITEM_HEIGHT, animated: false });
  }, [value]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const normalized = Math.max(0, Math.min(max, next));
    if (normalized !== value) {
      onChange(normalized);
    }
    ref.current?.scrollTo({ y: normalized * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.wheelWrapper}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelFrame}>
        <View style={styles.wheelHighlight} />
        <ScrollView
          ref={ref}
          contentContainerStyle={styles.wheelContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={onMomentumEnd}>
          {numbers.map((item) => (
            <View key={`${label}-${item}`} style={styles.wheelItem}>
              <Text style={[styles.wheelText, item === value && styles.wheelTextActive]}>
                {formatTwo(item)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export default function MetronomeTimerScreen() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);

  const [running, setRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectedSeconds = hours * 3600 + minutes * 60 + seconds;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const playBeepAndVibrate = async () => {
    // Без додаткового аудіо-пакета відтворюємо "пік" тактильно.
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate(500);
  };

  useEffect(() => {
    if (!running) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          return selectedSeconds;
        }

        const next = previous - 1;
        if (next % 60 === 0) {
          void playBeepAndVibrate();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, selectedSeconds]);

  const start = () => {
    if (selectedSeconds <= 0) {
      return;
    }
    setRemainingSeconds(selectedSeconds);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
  };

  const clearTimer = () => {
    setRunning(false);
    setHours(0);
    setMinutes(1);
    setSeconds(0);
    setRemainingSeconds(0);
  };

  const displaySeconds = running ? remainingSeconds : selectedSeconds;
  const displayHours = Math.floor(displaySeconds / 3600);
  const displayMinutes = Math.floor((displaySeconds % 3600) / 60);
  const displayRemainderSeconds = displaySeconds % 60;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContent}>
        <Text style={styles.title}>YourTime · Таймер-метроном</Text>
        <Text style={styles.subtitle}>Короткий пік і вібрація 0.5 с щохвилини</Text>

        <View style={styles.drumsRow}>
          <WheelPicker label="ГГ" value={hours} max={MAX_HOURS} onChange={setHours} />
          <WheelPicker label="ХХ" value={minutes} max={59} onChange={setMinutes} />
          <WheelPicker label="СС" value={seconds} max={59} onChange={setSeconds} />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>{running ? 'Залишилось' : 'Встановлений час'}</Text>
          <Text style={styles.previewValue}>
            {formatTwo(displayHours)}:{formatTwo(displayMinutes)}:{formatTwo(displayRemainderSeconds)}
          </Text>
        </View>

        <View style={styles.controlsRow}>
          <Pressable style={[styles.button, styles.startButton]} onPress={start}>
            <Text style={styles.buttonText}>Запустити</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.stopButton]} onPress={stop}>
            <Text style={styles.buttonText}>Зупинити</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.clearButton]} onPress={clearTimer}>
            <Text style={styles.buttonText}>Видалити</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06080f',
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 18,
  },
  title: {
    color: '#f4f6ff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca6be',
    fontSize: 14,
  },
  drumsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  wheelWrapper: {
    flex: 1,
    gap: 8,
  },
  wheelLabel: {
    textAlign: 'center',
    color: '#8e97ad',
    letterSpacing: 1,
    fontWeight: '600',
  },
  wheelFrame: {
    height: ITEM_HEIGHT * 5,
    borderRadius: 16,
    backgroundColor: '#111725',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1b2438',
  },
  wheelHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    left: 0,
    right: 0,
    backgroundColor: '#1b2842',
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText: {
    color: '#6f7890',
    fontSize: 28,
    fontWeight: '500',
  },
  wheelTextActive: {
    color: '#e8ecfa',
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: '#10192d',
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1d2a45',
  },
  previewLabel: {
    color: '#9eabc7',
    fontSize: 14,
  },
  previewValue: {
    color: '#f6f8ff',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#1f8f4e',
  },
  stopButton: {
    backgroundColor: '#d08c1a',
  },
  clearButton: {
    backgroundColor: '#ad3146',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
