package com.example.bank.demo.security;

import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutionException;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;

@Service
public class LoginAttemptService {
    private static final int MAX_ATTEMPTS = 3;
    private static final int BLOCK_DURATION_MINUTES = 5;
    private static final int LONG_BLOCK_DURATION_HOURS = 24;
    private static final int MAX_BLOCK_CYCLES = 3;
    
    private LoadingCache<String, Integer> attemptsCache;
    private ConcurrentHashMap<String, Long> blockCache;
    private ConcurrentHashMap<String, Integer> blockCyclesCache;
    private ConcurrentHashMap<String, Boolean> longBlockCache;

    public LoginAttemptService() {
        attemptsCache = CacheBuilder.newBuilder()
            .expireAfterWrite(BLOCK_DURATION_MINUTES, TimeUnit.MINUTES)
            .build(new CacheLoader<String, Integer>() {
                @Override
                public Integer load(String key) {
                    return 0;
                }
            });
        blockCache = new ConcurrentHashMap<>();
        blockCyclesCache = new ConcurrentHashMap<>();
        longBlockCache = new ConcurrentHashMap<>();
    }

    public void loginSucceeded(String username) {
        attemptsCache.invalidate(username);
        blockCache.remove(username);
        blockCyclesCache.remove(username);
        longBlockCache.remove(username);
    }

    public void loginFailed(String username) {
        // Vérifier si l'utilisateur est en blocage long
        if (isLongBlocked(username)) {
            return;
        }

        int attempts = 0;
        try {
            attempts = attemptsCache.get(username);
        } catch (ExecutionException e) {
            attempts = 0;
        }
        attempts++;
        attemptsCache.put(username, attempts);

        if (attempts >= MAX_ATTEMPTS) {
            blockCache.put(username, System.currentTimeMillis());
            int cycles = blockCyclesCache.getOrDefault(username, 0) + 1;
            blockCyclesCache.put(username, cycles);

            if (cycles >= MAX_BLOCK_CYCLES) {
                longBlockCache.put(username, true);
                blockCache.put(username, System.currentTimeMillis());
            }
        }
    }

    public boolean isBlocked(String username) {
        if (isLongBlocked(username)) {
            return true;
        }

        Long blockTime = blockCache.get(username);
        if (blockTime != null) {
            long elapsedTime = System.currentTimeMillis() - blockTime;
            if (elapsedTime < TimeUnit.MINUTES.toMillis(BLOCK_DURATION_MINUTES)) {
                return true;
            } else {
                if (!isLongBlocked(username)) {
                    blockCache.remove(username);
                    attemptsCache.invalidate(username);
                }
                return false;
            }
        }
        return false;
    }

    private boolean isLongBlocked(String username) {
        if (longBlockCache.getOrDefault(username, false)) {
            Long blockTime = blockCache.get(username);
            if (blockTime != null) {
                long elapsedTime = System.currentTimeMillis() - blockTime;
                if (elapsedTime < TimeUnit.HOURS.toMillis(LONG_BLOCK_DURATION_HOURS)) {
                    return true;
                } else {
                    // Réinitialiser après 24h
                    longBlockCache.remove(username);
                    blockCache.remove(username);
                    blockCyclesCache.remove(username);
                    attemptsCache.invalidate(username);
                }
            }
        }
        return false;
    }

    public long getRemainingBlockTime(String username) {
        Long blockTime = blockCache.get(username);
        if (blockTime != null) {
            long elapsedTime = System.currentTimeMillis() - blockTime;
            if (longBlockCache.getOrDefault(username, false)) {
                return TimeUnit.HOURS.toHours(LONG_BLOCK_DURATION_HOURS) - 
                       TimeUnit.MILLISECONDS.toHours(elapsedTime);
            } else {
                return TimeUnit.MINUTES.toMinutes(BLOCK_DURATION_MINUTES) - 
                       TimeUnit.MILLISECONDS.toMinutes(elapsedTime);
            }
        }
        return 0;
    }

    public int getAttempts(String username) {
        try {
            return attemptsCache.get(username);
        } catch (ExecutionException e) {
            return 0;
        }
    }

    public int getRemainingAttempts(String username) {
        return MAX_ATTEMPTS - getAttempts(username);
    }

    public boolean isInLongBlock(String username) {
        return longBlockCache.getOrDefault(username, false);
    }

    public int getBlockCycles(String username) {
        return blockCyclesCache.getOrDefault(username, 0);
    }
} 