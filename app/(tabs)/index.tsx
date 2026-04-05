import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Vibration } from 'react-native';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toSeconds = (hours: number, minutes: number, seconds: number) =>
  hours * 3600 + minutes * 60 + seconds;

const formatClock = (totalSeconds: number) => {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

type DrumType = 'hours' | 'minutes' | 'seconds';

export default function HomeScreen() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(toSeconds(0, 1, 0));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const periodInSeconds = useMemo(() => toSeconds(hours, minutes, seconds), [hours, minutes, seconds]);

  const playBeep = useCallback(() => {
    Vibration.vibrate([0, 650, 80, 350]);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setHours(0);
    setMinutes(1);
    setSeconds(0);
    setRemainingSeconds(toSeconds(0, 1, 0));
  }, [stopTimer]);

  const adjustDrum = (type: DrumType, delta: number) => {
    if (isRunning) {
      return;
    }

    if (type === 'hours') {
      setHours((value) => clamp(value + delta, 0, 23));
      return;
    }

    if (type === 'minutes') {
      setMinutes((value) => clamp(value + delta, 0, 59));
      return;
    }

    setSeconds((value) => clamp(value + delta, 0, 59));
  };

  const handleStart = () => {
    if (periodInSeconds <= 0) {
      return;
    }

    setRemainingSeconds(periodInSeconds);
    setIsRunning(true);
  };

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (periodInSeconds <= 0) {
      stopTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          playBeep();
          return periodInSeconds;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, periodInSeconds, playBeep, stopTimer]);

  useEffect(() => {
    if (!isRunning) {
      setRemainingSeconds(periodInSeconds);
    }
  }, [isRunning, periodInSeconds]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>YourTime • Метроном</Text>
      <Text style={styles.subtitle}>
        Виставляй інтервал барабанами, запускай і отримуй довший і сильніший пік (вібро) кожен цикл.
      </Text>

      <View style={styles.drumsRow}>
        {[
          { label: 'ГГ', value: hours, type: 'hours' as const },
          { label: 'ХХ', value: minutes, type: 'minutes' as const },
          { label: 'СС', value: seconds, type: 'seconds' as const },
        ].map((item) => (
          <View key={item.type} style={styles.drumColumn}>
            <Pressable style={styles.smallButton} onPress={() => adjustDrum(item.type, 1)}>
              <Text style={styles.smallButtonText}>＋</Text>
            </Pressable>

            <View style={styles.drumValueBox}>
              <Text style={styles.drumValue}>{item.value.toString().padStart(2, '0')}</Text>
              <Text style={styles.drumLabel}>{item.label}</Text>
            </View>

            <Pressable style={styles.smallButton} onPress={() => adjustDrum(item.type, -1)}>
              <Text style={styles.smallButtonText}>－</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.countdownCard}>
        <Text style={styles.countdownLabel}>Alert repeat every {formatClock(periodInSeconds)}</Text>
        <Text style={styles.countdownMeta}>Countdown</Text>
        <Text style={styles.countdownValue}>{formatClock(remainingSeconds)}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionButton, styles.startButton]} onPress={handleStart}>
          <Text style={styles.actionButtonText}>Запустити</Text>
        </Pressable>

        <Pressable style={[styles.actionButton, styles.stopButton]} onPress={stopTimer}>
          <Text style={styles.actionButtonText}>Зупинити</Text>
        </Pressable>

        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={resetTimer}>
          <Text style={styles.actionButtonText}>Видалити</Text>
        </Pressable>
      </View>

      <Text style={styles.statusText}>{isRunning ? 'Статус: працює' : 'Статус: зупинено'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08090b',
    paddingHorizontal: 18,
    paddingVertical: 24,
    gap: 18,
  },
  title: {
    color: '#f5f7ff',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 10,
  },
  subtitle: {
    color: '#96a0bd',
    fontSize: 15,
    lineHeight: 22,
  },
  drumsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  drumColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  drumValueBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#222739',
    backgroundColor: '#11131a',
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
  },
  drumValue: {
    fontSize: 34,
    fontWeight: '700',
    color: '#e9edff',
  },
  drumLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#7982a1',
  },
  smallButton: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#171a26',
    borderWidth: 1,
    borderColor: '#2a3043',
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#d9deef',
    fontSize: 22,
    fontWeight: '600',
  },
  countdownCard: {
    backgroundColor: '#11141e',
    borderColor: '#252c40',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  countdownLabel: {
    color: '#8d97b6',
    fontSize: 13,
  },
  countdownMeta: {
    color: '#d4d9ea',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownValue: {
    color: '#f2f5ff',
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#1f9d55',
  },
  stopButton: {
    backgroundColor: '#e0b400',
  },
  deleteButton: {
    backgroundColor: '#8b3141',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusText: {
    color: '#a5aec8',
    fontSize: 14,
  },
});
