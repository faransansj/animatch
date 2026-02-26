import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './PrivacyPolicy.module.css'; // Reuse PrivacyPolicy styles for consistency

export default function TermsOfService() {
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
                <h1 className={styles.title}>{t('common.terms')}</h1>
            </header>

            <div className={styles.content}>
                <p className={styles.lastUpdated}>
                    {isKo ? '최종 수정일: 2026년 2월 18일' : 'Last Updated: February 18, 2026'}
                </p>

                {isKo ? (
                    <>
                        <section className={styles.section}>
                            <h2>제1조 (목적)</h2>
                            <p>본 약관은 'AniMatch'(이하 '서비스') 운영자(이하 '운영자')가 제공하는 AI 기반 애니메이션 캐릭터 매칭 서비스의 이용 조건 및 절차, 이용자와 운영자의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>제2조 (서비스의 성격 및 이용)</h2>
                            <ol>
                                <li>서비스는 이용자가 업로드한 사진을 AI 알고리즘으로 분석하여 유사한 애니메이션 캐릭터를 매칭해주는 <strong>단순 오락용 서비스</strong>입니다.</li>
                                <li>AI 매칭 결과는 확률적 추정에 기초하며, 어떠한 과학적·객관적 근거를 가지지 않습니다. 이용자는 결과의 정확성이나 적합성을 신뢰하지 않음에 동의합니다.</li>
                                <li>본 서비스에 사용된 캐릭터 이미지는 팬아트 목적으로 AI 기술을 활용하여 제작되었으며, 원작의 공식 이미지가 아닙니다.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>제3조 (이용자의 의무 및 금지행위)</h2>
                            <ol>
                                <li>이용자는 다음 각 호의 행위를 해서는 안 됩니다.
                                    <ul>
                                        <li>타인의 초상권을 침해하는 사진(도용)을 업로드하는 행위</li>
                                        <li>음란, 폭력, 혐오감을 유발하는 부적절한 이미지를 업로드하는 행위</li>
                                        <li>서비스의 시스템을 역설계(Reverse Engineering), 해킹하거나 비정상적인 방법으로 이용하는 행위</li>
                                        <li>운영자의 사전 승인 없이 서비스 결과물을 상업적으로 이용하는 행위</li>
                                    </ul>
                                </li>
                                <li>이용자가 위 항을 위반하여 발생하는 모든 법적 책임(제3자의 소송 포함)은 <strong>이용자 본인</strong>에게 있으며, 운영자는 이에 대해 어떠한 책임도 지지 않습니다.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>제4조 (운영자의 면책 및 책임의 제한)</h2>
                            <ol>
                                <li><strong>결과의 불확실성:</strong> 운영자는 서비스가 제공하는 결과의 정확성, 최신성, 특정 목적에의 적합성을 보장하지 않습니다. 매칭 결과로 인해 발생하는 이용자의 주관적 만족도 저하, 심리적 충격 등에 대해 운영자는 면책됩니다.</li>
                                <li><strong>기술적 한계:</strong> 운영자는 서버 점검, 통신 장애, AI 모델의 오류 등 기술적 사유로 발생한 서비스 중단이나 데이터 유실에 대해 책임을 지지 않습니다.</li>
                                <li><strong>개인 운영의 특성:</strong> 본 서비스는 법인이 아닌 개인에 의해 제공되는 서비스로, 운영자의 고의 또는 중대한 과실이 없는 한 서비스 이용과 관련하여 발생한 이용자의 직접적·간접적 손해에 대해 책임을 지지 않습니다.</li>
                                <li><strong>손해배상의 한도:</strong> 만약 법원의 판결 등에 의해 운영자의 책임이 인정되는 경우라도, 운영자가 부담하는 손해배상 범위는 특별한 사정이 없는 한 이용자가 서비스를 이용하며 지불한 직접 비용(무료 서비스인 경우 0원)으로 제한됩니다.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>제5조 (개인정보 및 데이터 처리)</h2>
                            <ol>
                                <li>이용자가 업로드한 이미지는 매칭 결과 생성 즉시 파기되며, 어떠한 서버나 데이터베이스에도 영구 저장되지 않습니다.</li>
                                <li>상세한 개인정보 처리에 관한 사항은 별도의 <strong>'개인정보처리방침'</strong>에 따릅니다.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>제6조 (준거법 및 관할법원)</h2>
                            <p>본 약관과 관련하여 발생하는 분쟁은 대한민국 법령을 준거법으로 하며, 운영자의 소재지를 관할하는 법원을 합의 관할 법원으로 합니다.</p>
                        </section>
                    </>
                ) : (
                    <>
                        <section className={styles.section}>
                            <h2>Article 1 (Purpose)</h2>
                            <p>These Terms outline the conditions and procedures for using the AI-based animation character matching service provided by the operator of 'AniMatch' (hereinafter 'Operator'), as well as the rights, obligations, and responsibilities of both the user and the Operator.</p>
                        </section>

                        <section className={styles.section}>
                            <h2>Article 2 (Nature of Service)</h2>
                            <ol>
                                <li>The Service is a <strong>purely entertainment-based service</strong> that analyzes photos uploaded by users via AI algorithms to match them with similar animation characters.</li>
                                <li>AI matching results are based on probabilistic estimations and have no scientific or objective basis. Users agree not to rely on the accuracy or suitability of the results.</li>
                                <li>Character images used in this Service were created using AI technology for fan art purposes and are not official images from the original works.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>Article 3 (User Obligations and Prohibited Acts)</h2>
                            <ol>
                                <li>Users shall not engage in any of the following acts:
                                    <ul>
                                        <li>Uploading photos that infringe on others' portrait rights (misappropriation).</li>
                                        <li>Uploading inappropriate images that promote obscenity, violence, or hatred.</li>
                                        <li>Reverse engineering, hacking, or using the Service's system in an abnormal way.</li>
                                        <li>Using Service results for commercial purposes without the Operator's prior consent.</li>
                                    </ul>
                                </li>
                                <li>All legal liability (including third-party lawsuits) arising from a user's violation of the above is the <strong>sole responsibility of the user</strong>, and the Operator assumes no liability whatsoever.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>Article 4 (Limitation of Liability)</h2>
                            <ol>
                                <li><strong>Uncertainty of Results:</strong> The Operator does not guarantee the accuracy, timeliness, or fitness for a particular purpose of the Service results. The Operator is exempt from any liability regarding subjective dissatisfaction or psychological impact resulting from the match.</li>
                                <li><strong>Technical Limitations:</strong> The Operator is not responsible for service interruptions or data loss caused by technical reasons such as server maintenance, communication failures, or AI model errors.</li>
                                <li><strong>Individual Operation:</strong> This Service is provided by an individual, not a corporation. The Operator is not liable for any direct or indirect damages arising from the use of the Service unless there is willful misconduct or gross negligence.</li>
                                <li><strong>Cap on Damages:</strong> Even if the Operator's liability is recognized by a court judgment, the scope of damages is limited to the direct costs paid by the user for the Service (0 KRW for free services) unless there are exceptional circumstances.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>Article 5 (Privacy and Data Processing)</h2>
                            <ol>
                                <li>Images uploaded by users are destroyed immediately upon generation of results and are not permanently stored on any server or database.</li>
                                <li>Detailed matters regarding personal information processing shall follow the separate <strong>'Privacy Policy'</strong>.</li>
                            </ol>
                        </section>

                        <section className={styles.section}>
                            <h2>Article 6 (Governing Law and Jurisdiction)</h2>
                            <p>Any disputes arising in connection with these Terms shall be governed by the laws of the Republic of Korea, and the court having jurisdiction over the Operator's location shall be the agreed court of jurisdiction.</p>
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
