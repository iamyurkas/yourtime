import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

type WheelPickerProps = {
  label: string;
  max: number;
  value: number;
  onChange: (next: number) => void;
};

const ITEM_HEIGHT = 56;
const VISIBLE_ROWS = 3;

function buildRange(max: number) {
  return Array.from({ length: max + 1 }, (_, i) => i);
}

function WheelPicker({ label, max, value, onChange }: WheelPickerProps) {
  const options = useMemo(() => buildRange(max), [max]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const yOffset = event.nativeEvent.contentOffset.y;
      const next = Math.round(yOffset / ITEM_HEIGHT);
      const safe = Math.max(0, Math.min(max, next));
      onChange(safe);
    },
    [max, onChange],
  );

  return (
    <View style={styles.wheelColumn}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelContainer}>
        <View style={styles.wheelCenterMarker} />
        <FlatList
          data={options}
          keyExtractor={(item) => `${label}-${item}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          initialScrollIndex={value}
          contentContainerStyle={styles.wheelListContent}
          renderItem={({ item }) => {
            const isSelected = item === value;
            return (
              <View style={styles.wheelItem}>
                <Text style={[styles.wheelValue, isSelected && styles.wheelValueSelected]}>
                  {item.toString().padStart(2, '0')}
                </Text>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

function formatDuration(totalMs: number) {
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default function TimerScreen() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const lastTickRef = useRef<number | null>(null);
  const nextAlertMsRef = useRef<number>(0);

  const intervalMs = useMemo(
    () => (hours * 3600 + minutes * 60 + seconds) * 1000,
    [hours, minutes, seconds],
  );

  const triggerAlert = useCallback(async () => {
    Vibration.vibrate(1000);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleStart = useCallback(() => {
    if (intervalMs <= 0) {
      return;
    }

    const now = Date.now();
    lastTickRef.current = now;
    const stepsCompleted = Math.floor(elapsedMs / intervalMs);
    nextAlertMsRef.current = (stepsCompleted + 1) * intervalMs;
    setIsRunning(true);
  }, [elapsedMs, intervalMs]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    lastTickRef.current = null;
  }, []);

  const handleDelete = useCallback(() => {
    setIsRunning(false);
    setElapsedMs(0);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    lastTickRef.current = null;
    nextAlertMsRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isRunning || intervalMs <= 0) {
      return;
    }

    const timerId = setInterval(() => {
      const now = Date.now();
      const previousTick = lastTickRef.current ?? now;
      lastTickRef.current = now;

      const delta = now - previousTick;
      setElapsedMs((prev) => {
        const nextElapsed = prev + delta;

        while (nextElapsed >= nextAlertMsRef.current && intervalMs > 0) {
          void triggerAlert();
          nextAlertMsRef.current += intervalMs;
        }

        return nextElapsed;
      });
    }, 200);

    return () => clearInterval(timerId);
  }, [intervalMs, isRunning, triggerAlert]);

  const presets = [
    { label: '00:10:00', h: 0, m: 10, s: 0 },
    { label: '00:15:00', h: 0, m: 15, s: 0 },
    { label: '00:30:00', h: 0, m: 30, s: 0 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interval Metronome</Text>

      <View style={styles.wheelRow}>
        <WheelPicker label="Hours" max={99} value={hours} onChange={setHours} />
        <WheelPicker label="Minutes" max={59} value={minutes} onChange={setMinutes} />
        <WheelPicker label="Seconds" max={59} value={seconds} onChange={setSeconds} />
      </View>

      <View style={styles.presetRow}>
        {presets.map((preset) => (
          <Pressable
            key={preset.label}
            style={styles.presetButton}
            onPress={() => {
              setHours(preset.h);
              setMinutes(preset.m);
              setSeconds(preset.s);
            }}>
            <Text style={styles.presetText}>{preset.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current interval</Text>
        <Text style={styles.statusValue}>{formatDuration(intervalMs)}</Text>
        <Text style={styles.statusLabel}>Elapsed</Text>
        <Text style={styles.statusValue}>{formatDuration(elapsedMs)}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={[styles.actionButton, styles.startButton]} onPress={handleStart}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>

        <Pressable style={[styles.actionButton, styles.stopButton]} onPress={handleStop}>
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>

        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
      </View>

      <Text style={styles.footerText}>Alerts repeat automatically every selected interval.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C14',
    paddingTop: 60,
    paddingHorizontal: 18,
    gap: 20,
  },
  title: {
    color: '#F4F5F6',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  wheelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  wheelLabel: {
    color: '#B7B7C6',
    fontSize: 16,
    marginBottom: 8,
  },
  wheelContainer: {
    height: ITEM_HEIGHT * VISIBLE_ROWS,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#111423',
    overflow: 'hidden',
  },
  wheelCenterMarker: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: '#1E2337',
    borderWidth: 1,
    borderColor: '#2B3350',
    zIndex: 1,
  },
  wheelListContent: {
    paddingVertical: ITEM_HEIGHT,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelValue: {
    color: '#4E5470',
    fontSize: 34,
    fontWeight: '500',
  },
  wheelValueSelected: {
    color: '#F4F5F6',
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#23263B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    color: '#A3A8C0',
    fontSize: 13,
  },
  statusCard: {
    backgroundColor: '#111423',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  statusLabel: {
    color: '#8A90A8',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  statusValue: {
    color: '#EFF1FF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#22A447',
  },
  stopButton: {
    backgroundColor: '#D7A500',
  },
  deleteButton: {
    backgroundColor: '#9A2430',
  },
  buttonText: {
    color: '#0A0C14',
    fontSize: 17,
    fontWeight: '700',
  },
  footerText: {
    color: '#7D849F',
    textAlign: 'center',
    fontSize: 13,
  },
});
