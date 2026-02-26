import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './PrivacyPolicy.module.css';

export default function PrivacyPolicy() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const lang = i18n.language || 'en';
    const isKo = lang.startsWith('ko');

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
                            <h2>1. 개인정보의 수집 항목 및 대상</h2>
                            <p>본 서비스는 회원가입 없이 이용 가능한 비로그인 기반 서비스이며, <strong>만 14세 이상의 사용자만을 대상</strong>으로 합니다.</p>
                            <ul>
                                <li><strong>사용자 업로드 이미지:</strong> AI 분석을 위한 얼굴 사진 (실시간 전송 및 분석 후 즉시 파기)</li>
                                <li><strong>자동 생성 정보:</strong> IP 주소, 쿠키, 방문 일시, 기기 정보(OS, 브라우저 유형)</li>
                            </ul>
                            <p className={styles.note}>※ 자동 생성 정보는 서비스 부정 이용 방지 및 통계 분석을 위한 목적으로만 사용됩니다.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>2. 개인정보의 이용 목적</h2>
                            <p>수집된 정보는 다음의 목적으로만 한정하여 이용됩니다.</p>
                            <ul>
                                <li>AI 기반 애니메이션 캐릭터 매칭 결과 생성 및 제공</li>
                                <li>서비스 이용 통계 분석 및 품질 개선(에러 로그 확인 등)</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>3. 개인정보의 보유 및 파기 (데이터 제로 저장 정책)</h2>
                            <p>애니매치(AniMatch)는 사용자의 데이터를 저장하지 않습니다.</p>
                            <ul>
                                <li><strong>이미지 데이터:</strong> 업로드된 사진 및 분석 데이터는 AI 모델 분석 완료 즉시 메모리에서 <strong>영구 삭제</strong>됩니다. 어떠한 형태의 데이터베이스(DB)나 서버 스토리지에도 저장되지 않습니다.</li>
                                <li><strong>기타 로그 정보:</strong> 통계용 로그는 수집 목적 달성 후 또는 30일 경과 후 지체 없이 파기합니다.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>4. 개인정보 처리 위탁</h2>
                            <p>서비스 운영을 위해 클라우드 인프라(Vercel, AWS, Cloudflare 등)를 이용하며, 이 과정에서 데이터 처리가 해외 서버에서 수행될 수 있습니다. 이는 암호화된 통로를 통한 단순 위탁이며, 해당 업체는 사용자의 데이터를 열람하거나 저장할 수 없습니다.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>5. 이용자의 권리</h2>
                            <p>이용자는 개인정보 수집 및 처리 동의를 거부할 권리가 있으며, 동의하지 않을 경우 서비스 이용이 제한됩니다. 본 서비스는 데이터를 저장하지 않으므로, 별도의 삭제 요청 없이도 이용 종료와 함께 모든 데이터가 파기됩니다.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>6. 개인정보의 기술적·관리적 보호 조치</h2>
                            <ul>
                                <li><strong>데이터 전송 암호화:</strong> 모든 데이터는 HTTPS(SSL) 암호화 통신을 통해 안전하게 전송됩니다.</li>
                                <li><strong>서버리스/클라이언트 처리:</strong> 가능한 경우 브라우저 기반 분석을 우선하며, 서버 전송 시에도 휘발성 프로세스 내에서만 처리합니다.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>7. 개인정보 보호책임자 및 문의처</h2>
                            <p>본 서비스는 개인이 운영하며, 개인정보 관련 문의는 아래의 연락처로 해주시기 바랍니다.</p>
                            <p>이메일: <a href="mailto:support@animatch.social">support@animatch.social</a></p>
                        </section>
                    </>
                ) : (
                    <>
                        <section className={styles.section}>
                            <h2>1. Collected Items and Subject</h2>
                            <p>This is a non-login based service. It is intended <strong>only for users aged 14 and older</strong>.</p>
                            <ul>
                                <li><strong>User-Uploaded Images:</strong> Facial photos for AI analysis (transmitted in real-time and destroyed immediately after analysis).</li>
                                <li><strong>Automatically Generated Info:</strong> IP address, cookies, visit timestamp, device info (OS, browser type).</li>
                            </ul>
                            <p className={styles.note}>* Automatically generated info is used solely for preventing abuse and statistical analysis.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>2. Purpose of Use</h2>
                            <p>Collected information is used exclusively for the following purposes:</p>
                            <ul>
                                <li>Generating and providing AI-based anime character matching results.</li>
                                <li>Statistical analysis of service usage and quality improvement (error log checking, etc.).</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>3. Retention and Destruction (Zero Storage Policy)</h2>
                            <p>AniMatch does not store user data.</p>
                            <ul>
                                <li><strong>Image Data:</strong> Original photos and analysis data are <strong>permanently deleted</strong> from memory immediately after AI analysis. Data is never stored in any database or server storage.</li>
                                <li><strong>Other Log Info:</strong> Log data collected for statistics is destroyed without delay once the purpose is achieved or after 30 days.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>4. Entrustment of Personal Information Processing</h2>
                            <p>We use cloud infrastructure (Vercel, AWS, Cloudflare, etc.) for service operations, and data processing may be performed on overseas servers. This is a simple entrustment through encrypted channels, and these providers cannot access or store user data.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>5. User Rights</h2>
                            <p>Users have the right to refuse consent for collection and processing. If you do not agree, service use will be limited. Since no data is stored, it is automatically destroyed upon termination of use without a separate deletion request.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>6. Technical and Administrative Protection Measures</h2>
                            <ul>
                                <li><strong>Data Encryption:</strong> All data is transmitted safely via HTTPS (SSL) encrypted communication.</li>
                                <li><strong>Serverless/Client-Side Processing:</strong> We prioritize browser-based analysis where possible. When server transmission is necessary, it is processed only within volatile memory.</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>7. Data Protection Officer and Contact</h2>
                            <p>This service is operated by an individual. For privacy inquiries, please contact:</p>
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
