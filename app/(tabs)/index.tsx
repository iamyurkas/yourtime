import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

type TimeUnit = 'hours' | 'minutes' | 'seconds';

type WheelPickerProps = {
  label: string;
  max: number;
  value: number;
  onChange: (value: number) => void;
};

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;

function WheelPicker({ label, max, value, onChange }: WheelPickerProps) {
  const listRef = useRef<FlatList<number>>(null);

  const values = useMemo(() => Array.from({ length: max + 1 }, (_, idx) => idx), [max]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: value * ITEM_HEIGHT, animated: true });
  }, [value]);

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const safe = Math.max(0, Math.min(max, next));
      if (safe !== value) {
        onChange(safe);
      }
      listRef.current?.scrollToOffset({ offset: safe * ITEM_HEIGHT, animated: false });
    },
    [max, onChange, value],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<number>) => (
      <View style={[styles.wheelItem, item === value && styles.wheelItemActive]}>
        <Text style={[styles.wheelItemText, item === value && styles.wheelItemTextActive]}>
          {String(item).padStart(2, '0')}
        </Text>
      </View>
    ),
    [value],
  );

  return (
    <View style={styles.wheelColumn}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelViewport}>
        <FlatList
          ref={listRef}
          data={values}
          keyExtractor={(item) => `${label}-${item}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          getItemLayout={(_, index) => ({
            index,
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
          })}
          contentContainerStyle={styles.wheelContent}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          initialScrollIndex={value}
        />
        <View pointerEvents="none" style={styles.wheelMarker} />
      </View>
    </View>
  );
}

export default function TimerScreen() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [now, setNow] = useState(Date.now());

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTriggerRef = useRef<number | null>(null);

  const intervalMs = useMemo(() => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds * 1000;
  }, [hours, minutes, seconds]);

  const clearSchedule = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    nextTriggerRef.current = null;
  }, []);

  const playSignal = useCallback(async () => {
    Vibration.vibrate([0, 500, 120, 500], false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const scheduleNext = useCallback(async () => {
    const nextTrigger = nextTriggerRef.current;
    if (!nextTrigger || intervalMs <= 0 || !isRunning) {
      return;
    }

    const now = Date.now();
    const delay = Math.max(0, nextTrigger - now);

    timeoutRef.current = setTimeout(async () => {
      await playSignal();
      setCycles((prev) => prev + 1);

      const target = (nextTriggerRef.current ?? Date.now()) + intervalMs;
      nextTriggerRef.current = target;
      await scheduleNext();
    }, delay);
  }, [intervalMs, isRunning, playSignal]);

  useEffect(() => {
    if (!isRunning || intervalMs <= 0) {
      return;
    }

    nextTriggerRef.current = Date.now() + intervalMs;
    void scheduleNext();

    return clearSchedule;
  }, [clearSchedule, intervalMs, isRunning, scheduleNext]);

  useEffect(
    () => () => {
      clearSchedule();
    },
    [clearSchedule],
  );

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const ticker = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(ticker);
  }, [isRunning]);

  const onStart = () => {
    if (intervalMs <= 0) {
      return;
    }
    setCycles(0);
    setNow(Date.now());
    setIsRunning(true);
  };

  const onStop = () => {
    setIsRunning(false);
    clearSchedule();
  };

  const onReset = () => {
    setIsRunning(false);
    clearSchedule();
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setCycles(0);
  };

  const updateUnit = (unit: TimeUnit, value: number) => {
    if (isRunning) {
      return;
    }

    if (unit === 'hours') setHours(value);
    if (unit === 'minutes') setMinutes(value);
    if (unit === 'seconds') setSeconds(value);
  };

  const hasInterval = intervalMs > 0;
  const remainingMs = Math.max(0, (nextTriggerRef.current ?? now) - now);
  const remainingHours = Math.floor(remainingMs / 3_600_000);
  const remainingMinutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const remainingSeconds = Math.floor((remainingMs + 999) / 1000) % 60;
  const countdown = `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Interval Metronome</Text>
      <Text style={styles.subtitle}>Choose HH : MM : SS and run periodic alerts.</Text>

      <View style={styles.wheelsRow}>
        <WheelPicker label="HH" max={23} value={hours} onChange={(value) => updateUnit('hours', value)} />
        <WheelPicker
          label="MM"
          max={59}
          value={minutes}
          onChange={(value) => updateUnit('minutes', value)}
        />
        <WheelPicker
          label="SS"
          max={59}
          value={seconds}
          onChange={(value) => updateUnit('seconds', value)}
        />
      </View>

      <Text style={styles.hint}>
        {hasInterval
          ? `Alert repeats every ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : 'Set a non-zero interval to start'}
      </Text>
      <Text style={styles.countdown}>
        {isRunning ? `Next alert in: ${countdown}` : 'Next alert in: --:--:--'}
      </Text>

      <Text style={styles.cycles}>Completed intervals: {cycles}</Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.startButton, (!hasInterval || isRunning) && styles.buttonDisabled]}
          onPress={onStart}
          disabled={!hasInterval || isRunning}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.stopButton, !isRunning && styles.buttonDisabled]} onPress={onStop} disabled={!isRunning}>
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.dangerButton]} onPress={onReset}>
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0D10',
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  title: {
    color: '#F4F6F8',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A5ACB8',
    marginTop: 8,
    fontSize: 15,
  },
  wheelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    gap: 12,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  wheelLabel: {
    color: '#7B8494',
    fontSize: 12,
    marginBottom: 10,
    letterSpacing: 1,
  },
  wheelViewport: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#121722',
    overflow: 'hidden',
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemActive: {
    backgroundColor: '#1A2130',
  },
  wheelItemText: {
    color: '#788398',
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  wheelItemTextActive: {
    color: '#F7FAFF',
    fontWeight: '700',
  },
  wheelMarker: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    borderColor: '#2A3447',
    borderWidth: 1,
  },
  hint: {
    color: '#C4CAD6',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
  },
  countdown: {
    color: '#E9EDF5',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  cycles: {
    color: '#8E97A9',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 26,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#2A3342',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2BAE66',
  },
  stopButton: {
    backgroundColor: '#E7B416',
  },
  dangerButton: {
    backgroundColor: '#D34B58',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
