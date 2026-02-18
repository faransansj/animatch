import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './PrivacyPolicy.module.css';

export default function PrivacyPolicy() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isKo = i18n.language === 'ko';

    return (
        <motion.section
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    {t('common.back')}
                </button>
                <h1 className={styles.title}>{t('common.privacy')}</h1>
            </header>

            <div className={styles.content}>
                <p className={styles.lastUpdated}>
                    {isKo ? '최종 수정일: 2026년 2월 18일' : 'Last Updated: February 18, 2026'}
                </p>

                {isKo ? (
                    <>
                        <section className={styles.section}>
                            <h2>1. 수집하는 개인정보 항목</h2>
                            <p>애니매치(AniMatch)는 서비스 제공을 위해 최소한의 개인정보를 수집합니다.</p>
                            <ul>
                                <li><strong>사진 데이터:</strong> 사용자가 분석을 위해 직접 업로드한 얼굴 사진</li>
                                <li><strong>기기 정보:</strong> 운영체제 버전, 브라우저 유형 등 서비스 최적화를 위한 비로그인성 정보</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>2. 개인정보의 이용 목적</h2>
                            <p>수집된 정보는 오직 다음의 목적으로만 이용됩니다.</p>
                            <ul>
                                <li>사용자의 얼굴 특징 분석을 통한 애니메이션 캐릭터 매칭 결과 제공</li>
                                <li>서비스 이용 통계 분석 및 품질 개선</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>3. 개인정보의 보유 및 파기</h2>
                            <p>애니매치는 <strong>'즉시 파기'</strong> 원칙을 준수합니다.</p>
                            <ul>
                                <li>사용자가 업로드한 원본 사진은 AI 모델 분석이 완료되는 즉시 메모리에서 삭제되며, 어떠한 서버나 데이터베이스에도 저장되지 않습니다.</li>
                                <li>매칭 결과 데이터 역시 일회성으로 제공되며 영구 저장되지 않습니다.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>4. 개인정보의 기술적 보호 조치</h2>
                            <p>사용자의 안전한 서비스 이용을 위해 다음과 같은 조치를 취하고 있습니다.</p>
                            <ul>
                                <li>모든 데이터 전송은 SSL 암호화 통신을 통해 이루어집니다.</li>
                                <li>클라이언트 사이드(브라우저) 기반 AI 분석 모델을 우선적으로 활용하여 서버 전송을 최소화합니다.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>5. 문의처</h2>
                            <p>개인정보 처리와 관련한 문의사항은 아래 연락처로 문의해 주시기 바랍니다.</p>
                            <p>이메일: <a href="mailto:support@animatch.social">support@animatch.social</a></p>
                        </section>
                    </>
                ) : (
                    <>
                        <section className={styles.section}>
                            <h2>1. Collected Information</h2>
                            <p>AniMatch collects minimal personal information to provide its services.</p>
                            <ul>
                                <li><strong>Photo Data:</strong> Face photos uploaded by the user for analysis.</li>
                                <li><strong>Device Info:</strong> Non-personally identifiable information such as OS version and browser type for service optimization.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>2. Purpose of Collection</h2>
                            <p>Collected information is used exclusively for the following purposes:</p>
                            <ul>
                                <li>Providing matching results by analyzing facial features.</li>
                                <li>Analyzing service usage statistics and improving quality.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>3. Retention and Destruction</h2>
                            <p>AniMatch adheres to the <strong>'Immediate Destruction'</strong> principle.</p>
                            <ul>
                                <li>Original photos uploaded by users are deleted from memory immediately upon completion of the AI model analysis and are never stored on any server or database.</li>
                                <li>Matching result data is provided on a one-time basis and is not permanently stored.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>4. Technical Security Measures</h2>
                            <p>We take the following measures to ensure safe service usage:</p>
                            <ul>
                                <li>All data transmission is protected by SSL encryption.</li>
                                <li>We prioritize client-side (browser-based) AI analysis models to minimize server data transmission.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>5. Contact Us</h2>
                            <p>For inquiries regarding personal information processing, please contact us at:</p>
                            <p>Email: <a href="mailto:support@animatch.social">support@animatch.social</a></p>
                        </section>
                    </>
                )}
            </div>

            <footer className={styles.footer}>
                <button className={styles.homeBtn} onClick={() => navigate('/')}>
                    {t('common.backToHome')}
                </button>
            </footer>
        </motion.section>
    );
}
