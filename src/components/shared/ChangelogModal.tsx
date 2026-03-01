import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ChangelogModal.module.css';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CHANGELOG_DATA = [
    {
        version: 'v1.2.0',
        date: '2026. 03. 01',
        changes: [
            '캐릭터 도감 리스트 및 상세 페이지 추가 (Character Gallery & Detail Pages Added)',
            '디자인 레이아웃 및 URL 라우팅 개선 (UI Layout & URL Routing Improvements)',
        ]
    },
    {
        version: 'v1.1.0',
        date: '2026. 02. 26',
        changes: [
            'SEO 최적화 적용 및 메타태그 동적 생성 (SEO Optimization & Dynamic Meta Tags)',
            '캐시 Validation 전략 추가 (Cache Validation Strategy Updated)',
        ]
    },
    {
        version: 'v1.0.0',
        date: '2026. 02. 22',
        changes: [
            '정식 서비스 오픈 (Official Service Launch)',
            '운명의 애니메이션 연인 매칭 기능 (Anime Partner Matching)',
            '다국어 지원 (Multilingual Support - KR, EN, JP, TW)',
        ]
    }
];

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
                    <motion.div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className={styles.header}>
                            <h2 className={styles.title}>Version History</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={onClose}
                                aria-label="Close modal"
                            >
                                &times;
                            </button>
                        </div>

                        <div className={styles.content}>
                            {CHANGELOG_DATA.map((release, idx) => (
                                <motion.div
                                    key={release.version}
                                    className={styles.versionBlock}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                >
                                    <div className={styles.versionHeader}>
                                        <span className={styles.versionNum}>{release.version}</span>
                                        <span className={styles.versionDate}>{release.date}</span>
                                    </div>
                                    <ul className={styles.changesList}>
                                        {release.changes.map((change, i) => (
                                            <li key={i}>{change}</li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
