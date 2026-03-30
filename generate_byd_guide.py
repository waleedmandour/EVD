import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, PageBreak, Table, TableStyle,
    SimpleDocTemplate, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Font Registration ──
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/english/calibri-regular.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('Calibri', normal='Calibri', bold='Calibri')

# ── Document Setup ──
pdf_filename = "BYD_Imported_Vehicle_Software_Update_Guide.pdf"
output_path = f"/home/z/my-project/download/{pdf_filename}"
title_for_metadata = os.path.splitext(pdf_filename)[0]

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    title=title_for_metadata,
    author='Z.ai',
    creator='Z.ai',
    subject='Comprehensive guide for BYD imported vehicle owners to obtain software updates',
    leftMargin=2.2*cm,
    rightMargin=2.2*cm,
    topMargin=2.5*cm,
    bottomMargin=2.5*cm,
)

# ── Color Scheme ──
DARK_BLUE = colors.HexColor('#1F4E79')
ACCENT_BLUE = colors.HexColor('#2980B9')
LIGHT_GRAY = colors.HexColor('#F5F5F5')
DARK_TEXT = colors.HexColor('#2C3E50')
MEDIUM_TEXT = colors.HexColor('#34495E')

# ── Styles ──
cover_title_style = ParagraphStyle(
    name='CoverTitle', fontName='Times New Roman', fontSize=36, leading=44,
    alignment=TA_CENTER, spaceAfter=24, textColor=DARK_BLUE
)
cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle', fontName='Times New Roman', fontSize=16, leading=22,
    alignment=TA_CENTER, spaceAfter=12, textColor=MEDIUM_TEXT
)
cover_info_style = ParagraphStyle(
    name='CoverInfo', fontName='Times New Roman', fontSize=12, leading=18,
    alignment=TA_CENTER, spaceAfter=8, textColor=MEDIUM_TEXT
)
h1_style = ParagraphStyle(
    name='H1', fontName='Times New Roman', fontSize=20, leading=26,
    spaceBefore=18, spaceAfter=10, textColor=DARK_BLUE
)
h2_style = ParagraphStyle(
    name='H2', fontName='Times New Roman', fontSize=15, leading=20,
    spaceBefore=14, spaceAfter=8, textColor=DARK_BLUE
)
h3_style = ParagraphStyle(
    name='H3', fontName='Times New Roman', fontSize=12, leading=17,
    spaceBefore=10, spaceAfter=6, textColor=MEDIUM_TEXT
)
body_style = ParagraphStyle(
    name='Body', fontName='Times New Roman', fontSize=10.5, leading=17,
    alignment=TA_JUSTIFY, spaceAfter=8, textColor=DARK_TEXT
)
bullet_style = ParagraphStyle(
    name='Bullet', fontName='Times New Roman', fontSize=10.5, leading=17,
    alignment=TA_LEFT, spaceAfter=4, leftIndent=24, bulletIndent=12,
    textColor=DARK_TEXT
)
tip_style = ParagraphStyle(
    name='Tip', fontName='Times New Roman', fontSize=10, leading=16,
    alignment=TA_LEFT, spaceAfter=6, leftIndent=20, rightIndent=20,
    textColor=colors.HexColor('#1B5E20'), backColor=colors.HexColor('#E8F5E9'),
    borderPadding=8
)
warning_style = ParagraphStyle(
    name='Warning', fontName='Times New Roman', fontSize=10, leading=16,
    alignment=TA_LEFT, spaceAfter=6, leftIndent=20, rightIndent=20,
    textColor=colors.HexColor('#B71C1C'), backColor=colors.HexColor('#FFEBEE'),
    borderPadding=8
)
caption_style = ParagraphStyle(
    name='Caption', fontName='Times New Roman', fontSize=9.5, leading=14,
    alignment=TA_CENTER, spaceBefore=4, spaceAfter=6, textColor=MEDIUM_TEXT
)
link_style = ParagraphStyle(
    name='Link', fontName='Times New Roman', fontSize=10, leading=15,
    alignment=TA_LEFT, spaceAfter=3, textColor=ACCENT_BLUE, leftIndent=24,
    bulletIndent=12
)

# Table styles
th_style = ParagraphStyle(
    name='TH', fontName='Times New Roman', fontSize=10.5, leading=15,
    alignment=TA_CENTER, textColor=colors.white
)
td_style = ParagraphStyle(
    name='TD', fontName='Times New Roman', fontSize=10, leading=15,
    alignment=TA_CENTER, textColor=DARK_TEXT
)
td_left = ParagraphStyle(
    name='TDLeft', fontName='Times New Roman', fontSize=10, leading=15,
    alignment=TA_LEFT, textColor=DARK_TEXT
)

TABLE_HEADER_COLOR = DARK_BLUE
TABLE_ROW_ODD = LIGHT_GRAY

story = []

# ═══════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════
story.append(Spacer(1, 100))
story.append(Paragraph('<b>Software Update Guide for<br/>Imported BYD Vehicles</b>', cover_title_style))
story.append(Spacer(1, 24))
story.append(Paragraph('Practical Solutions for BYD Yuan Plus (Atto 3) Owners<br/>in the Middle East and Other Regions Outside China', cover_subtitle_style))
story.append(Spacer(1, 48))
story.append(Paragraph('Compiled: March 2026', cover_info_style))
story.append(Paragraph('Applies to: Chinese-spec BYD vehicles with DiLink system', cover_info_style))
story.append(Spacer(1, 60))
story.append(Paragraph(
    'This guide consolidates official channels, community-discovered methods,<br/>'
    'and third-party options to help imported BYD owners maintain their vehicles.',
    cover_info_style
))
story.append(PageBreak())

# ═══════════════════════════════════════════
# SECTION 1: UNDERSTANDING THE PROBLEM
# ═══════════════════════════════════════════
story.append(Paragraph('<b>1. Understanding Why Your Car Does Not Receive Updates</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph('<b>1.1 How BYD OTA Updates Work</b>', h2_style))
story.append(Paragraph(
    'BYD delivers Over-The-Air (OTA) updates to vehicles through its DiLink intelligent cockpit system, which '
    'runs on a customized Android platform. When a vehicle connects to the internet (via Wi-Fi or its built-in '
    'cellular modem), the DiLink system periodically checks BYD servers for available firmware updates. If an '
    'update is available for the specific vehicle model, region, and current firmware version, it downloads and '
    'installs the update automatically or prompts the driver to confirm installation. This mechanism ensures that '
    'vehicles always have the latest features, bug fixes, and safety improvements without requiring a visit to a '
    'service center. The OTA system is the primary channel through which BYD distributes software improvements '
    'to its global fleet.', body_style))

story.append(Paragraph(
    'However, the OTA system is fundamentally region-locked. Each BYD vehicle is registered in BYD\'s servers '
    'against a specific market region during manufacturing. The vehicle\'s system software, its DiLink interface, '
    'and the backend server infrastructure are all configured to match that original market. A car manufactured '
    'for the Chinese domestic market will only check Chinese servers for updates, and those servers will only '
    'serve firmware approved for the China region. This is not a bug or an oversight; it is an intentional '
    'design choice by BYD, rooted in regulatory compliance, market segmentation, and operational considerations.', body_style))

story.append(Paragraph('<b>1.2 The Root Causes of the Update Block</b>', h2_style))
story.append(Paragraph(
    'The inability of imported Chinese-spec BYD vehicles to receive OTA updates stems from several interconnected '
    'factors. Understanding these factors is essential for evaluating any potential solution, as each approach '
    'must address one or more of these underlying barriers.', body_style))

story.append(Paragraph(
    '<b>Server-Side Region Filtering:</b> BYD\'s OTA infrastructure authenticates each vehicle by its VIN (Vehicle '
    'Identification Number) and firmware region code. When the DiLink system contacts BYD servers, the server '
    'checks whether the VIN corresponds to a vehicle registered in the China market. If the vehicle is outside '
    'China and connecting from a non-Chinese IP address, the server may simply not respond with update data. '
    'Even if the connection succeeds, the server will only provide firmware packages that match the vehicle\'s '
    'registered region. This is the most significant barrier, as it operates entirely on BYD\'s server '
    'infrastructure and is not something vehicle owners can bypass through local software modifications alone.', body_style))

story.append(Paragraph(
    '<b>Regulatory Compliance Differences:</b> Chinese-market vehicles are certified under Chinese regulatory '
    'standards (GB standards), which differ significantly from those in the Middle East (GSO standards), Europe '
    '(UNECE regulations), or other regions. Firmware updates may include changes to battery management, motor '
    'control, driver-assistance calibration, emissions parameters, or connectivity protocols that are specific '
    'to the Chinese regulatory environment. BYD restricts cross-region updates partly because deploying firmware '
    'optimized for Chinese regulations on a vehicle operating under a different regulatory framework could create '
    'legal liability for both BYD and the vehicle owner.', body_style))

story.append(Paragraph(
    '<b>Infrastructure Dependencies:</b> Chinese-spec DiLink systems come pre-loaded with Chinese ecosystem apps '
    'and services such as Baidu Maps, Tencent services, WeChat, and Chinese voice recognition engines. These '
    'services either do not function outside China or require specific network configurations (such as access '
    'to Chinese DNS and API servers) that are unavailable in most other countries. An OTA update designed for '
    'the Chinese market will not include replacements for these services with global equivalents like Google '
    'Maps or Apple CarPlay, leaving the vehicle\'s infotainment system partially non-functional for everyday use.', body_style))

# ═══════════════════════════════════════════
# SECTION 2: OFFICIAL CHANNELS
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>2. Official Channels (Recommended Path)</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph('<b>2.1 BYD Official Presence in the Middle East</b>', h2_style))
story.append(Paragraph(
    'BYD has been rapidly expanding its official presence across the Middle East and GCC region. The company '
    'maintains dedicated regional offices and has established partnerships with authorized distributors in '
    'multiple countries. For Oman specifically, BYD operates through its official regional website (byd.com/om) '
    'and the broader Middle East and Africa portal (byd.com/mea). This official presence is significant because '
    'it means BYD has committed infrastructure, support staff, and service capabilities in your region, and '
    'these are precisely the channels through which legitimate firmware updates for the region are distributed.', body_style))

story.append(Paragraph(
    'In late 2024 and throughout 2025, BYD made notable progress in providing OTA updates to officially sold '
    'vehicles in the GCC. The BYD ATTO 3 (known as Yuan Plus in China) received a major DiLink OS update '
    '(version 1.2.0) specifically for GCC countries, delivered by BYD Middle East and Africa. This demonstrates '
    'that BYD\'s regional infrastructure is actively pushing updates to vehicles sold through official channels '
    'in the Middle East. The challenge for import owners is that their vehicles are not registered in this system '
    'because they were not sold through BYD\'s regional distribution network.', body_style))

story.append(Paragraph(
    '<b>Action Step:</b> Contact BYD Middle East and Africa directly through their official channels to request '
    'that your imported vehicle be registered in their regional update system. Even if they initially decline, '
    'persistent requests from multiple import owners create pressure that can lead to policy changes. BYD has '
    'shown willingness to expand services in response to customer demand in other regions.', body_style))

story.append(Paragraph('<b>2.2 Working with Your Dealer or Import Agent</b>', h2_style))
story.append(Paragraph(
    'If you purchased your BYD through an import agent or dealership, they may have established relationships '
    'with BYD service networks that can facilitate software updates. Some import agents in the Middle East '
    'have developed workarounds by coordinating with BYD\'s regional offices or by maintaining connections with '
    'Chinese service centers. Contact your dealer and ask specifically about software update support. Be clear '
    'about your vehicle\'s model, year, current firmware version (found in Settings > System > About in the '
    'DiLink interface), and the VIN. The more specific information you provide, the better equipped they will '
    'be to find a solution.', body_style))

story.append(Paragraph(
    'In the UAE, for example, multiple Reddit users in the Dubai PetrolHeads community have reported that their '
    'dealers have been able to arrange firmware updates and even unlock features like cruise control that were '
    'restricted in the Chinese-spec software. One user specifically noted that their dealer "emailed back that '
    'they\'ll update the firmware to unlock cruise control" after a service visit. This suggests that dealers '
    'with direct access to BYD service tools may be able to flash region-appropriate or updated firmware during '
    'routine maintenance, bypassing the OTA system entirely.', body_style))

story.append(Paragraph('<b>2.3 Requesting Region Re-registration</b>', h2_style))
story.append(Paragraph(
    'One of the most promising official avenues is to formally request that BYD re-register your vehicle from '
    'the China region to your actual region (Middle East/GCC). This would, in theory, redirect your vehicle\'s '
    'OTA connection from Chinese servers to the regional Middle East servers, enabling you to receive the same '
    'updates as officially sold vehicles. To pursue this, you should prepare a formal written request that '
    'includes your VIN, proof of purchase, proof of import (customs documentation), and your current location. '
    'Submit this request to BYD Middle East and Africa through their official support channels, and simultaneously '
    'contact BYD customer support in China (through the DiLink app or their Chinese website) to request that '
    'your vehicle\'s region be changed in their database.', body_style))

story.append(Paragraph(
    'While there is no guarantee that BYD will honor this request, it is worth pursuing for several reasons. '
    'First, it establishes a formal record of your request that can be referenced if BYD later faces regulatory '
    'or consumer protection inquiries about abandoned import owners. Second, BYD is actively working to build '
    'its brand reputation in the Middle East, and treating existing customers well (even those who imported) '
    'is in their commercial interest. Third, other Chinese manufacturers have begun offering region transfer '
    'services for imported vehicles in some markets, creating competitive pressure for BYD to do the same.', body_style))

# ═══════════════════════════════════════════
# SECTION 3: PRACTICAL WORKAROUNDS
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>3. Practical Workarounds Used by the Community</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'Beyond official channels, the global community of BYD import owners has discovered several practical '
    'workarounds that have been reported to work for specific models and firmware versions. These methods '
    'carry varying levels of risk, and you should carefully evaluate each one before proceeding.', body_style))

story.append(Paragraph('<b>3.1 Pre-Export Firmware Flashing</b>', h2_style))
story.append(Paragraph(
    'The most reliable community-reported solution is pre-export firmware flashing, which involves having the '
    'vehicle\'s firmware changed to the global version before it leaves China. Several export agents and vehicle '
    'sourcing companies in China offer this service. The process typically involves connecting a diagnostic tool '
    'to the vehicle\'s OBD-II port and flashing the global-market firmware onto the DiLink system. This replaces '
    'the Chinese-spec software with the international version, which includes features like Android Auto, Apple '
    'CarPlay, Google Maps compatibility, and proper English language support. Once the global firmware is '
    'installed, the vehicle connects to BYD\'s international servers for future OTA updates, resolving the '
    'update problem permanently.', body_style))

story.append(Paragraph(
    'If you have not yet imported your vehicle, or if you are considering purchasing another BYD from China, '
    'this is the option to pursue. Contact Chinese export agents (such as those listed on platforms like Alibaba '
    'or specialized vehicle export companies) and explicitly request "global firmware pre-installation" or '
    '"international version software" before shipping. Many agents are familiar with this process, as demand '
    'from Middle Eastern and other international buyers has made it a common request. The cost typically ranges '
    'from a few hundred to a thousand dollars, depending on the agent and the complexity of the firmware '
    'conversion. This is widely considered the gold standard solution by the import community.', body_style))

story.append(Paragraph(
    'If your vehicle is already in Oman, you may still be able to pursue this option by contacting Chinese '
    'export agents who offer remote coordination services. Some agents can arrange for firmware flashing to be '
    'done at a Chinese BYD service center before the vehicle is shipped, or they can provide the firmware files '
    'and instructions for flashing by a local technician. However, post-import firmware flashing is more complex '
    'and carries additional risks, including potential warranty implications.', body_style))

story.append(Paragraph('<b>3.2 Dealer-Initiated Firmware Updates</b>', h2_style))
story.append(Paragraph(
    'Some BYD dealers in the Middle East, particularly in the UAE and Saudi Arabia, have the diagnostic '
    'equipment and access needed to manually update vehicle firmware during service visits. This bypasses '
    'the OTA system entirely, as the update is applied directly through a wired connection to the vehicle\'s '
    'electronic control units. The process is similar to how software updates were delivered before OTA '
    'technology became standard in the automotive industry. If your local dealer has BYD diagnostic tools '
    '(specifically the BYD proprietary diagnostic system, not generic OBD-II scanners), they may be able '
    'to apply the latest available firmware for your vehicle model.', body_style))

story.append(Paragraph(
    'To explore this option, call or visit BYD-authorized service centers in your region and ask whether they '
    'can perform a manual firmware update on a Chinese-spec BYD. Be transparent about your vehicle\'s origin. '
    'Some dealers may decline for policy reasons, but others, particularly independent service centers that '
    'work with multiple Chinese brands, may be willing to attempt the procedure. The cost varies by dealer, '
    'but it is typically charged as a standard software update service. This approach has been confirmed to '
    'work by several owners in the Dubai PetrolHeads community who reported successful firmware updates at '
    'their dealerships.', body_style))

story.append(Paragraph('<b>3.3 Community Firmware Sharing</b>', h2_style))
story.append(Paragraph(
    'Active BYD owner communities on platforms like Facebook, Reddit, XDA Forums, and Telegram have established '
    'channels for sharing firmware update files and installation guides. These communities are particularly '
    'valuable because members often obtain firmware files directly from BYD service centers or through '
    'diagnostic tool captures, and they share detailed step-by-step instructions for installation. The '
    'Telegram channel "Just BYD" (t.me/just_byd) is one of the most active and well-maintained resources, '
    'regularly posting firmware update notifications, version comparisons, and download links for various '
    'BYD models.', body_style))

story.append(Paragraph(
    'Facebook groups dedicated to BYD owners in the Middle East and globally are another important resource. '
    'Multiple groups have threads specifically about software updates for Chinese-imported vehicles, with '
    'owners sharing their experiences, successful methods, and contacts for technicians who can perform '
    'firmware updates. The XDA Forums thread titled "Possible Way to Add CarPlay to Chinese Version of BYD '
    'DiLink 4.0" is particularly notable for its technical depth, as community developers have been working '
    'on extracting features from global firmware and porting them to Chinese-spec systems. While these methods '
    'are more technical and carry higher risk, they represent the cutting edge of community-driven solutions.', body_style))

story.append(Paragraph('<b>Key Community Resources:</b>', h3_style))
story.append(Paragraph('Telegram: t.me/just_byd (firmware updates and BYD news)', bullet_style))
story.append(Paragraph('Facebook: Search for "BYD Owners" groups in your region', bullet_style))
story.append(Paragraph('Reddit: r/BYD (active discussion on import-related issues)', bullet_style))
story.append(Paragraph('XDA Forums: BYD DiLink custom ROM development threads', bullet_style))
story.append(Paragraph('YouTube: Search "BYD firmware upgrade" for video guides', bullet_style))

# ═══════════════════════════════════════════
# SECTION 4: THIRD-PARTY SERVICES
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>4. Third-Party Service Providers</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'A growing ecosystem of third-party service providers has emerged to address the specific needs of Chinese '
    'vehicle import owners. These providers range from specialized automotive software companies to individual '
    'technicians who offer firmware update services as a business. While these services are not officially '
    'sanctioned by BYD, they have become an important practical resource for import owners who have exhausted '
    'official channels without success.', body_style))

story.append(Paragraph('<b>4.1 Known Service Providers</b>', h2_style))
story.append(Paragraph(
    '<b>Tika (Third-Party Provider):</b> Mentioned by BYD owners on Facebook as a third-party provider that can '
    'enable app functionality and software features on Chinese-imported BYD vehicles. According to community '
    'reports, Tika offers services that modify the DiLink system to add features not available in the '
    'Chinese-spec firmware. While details about this provider are limited in public sources, the mention in '
    'multiple BYD owner groups suggests it is an active service. Contact information would need to be obtained '
    'through the relevant Facebook groups or BYD community channels.', body_style))

story.append(Paragraph(
    '<b>Chinese Export Agents with Post-Sale Support:</b> Several Chinese vehicle export companies have expanded '
    'their services to include ongoing software support for vehicles they have exported. These agents maintain '
    'relationships with BYD service centers in China and can coordinate remote firmware updates by providing '
    'the necessary files and technical guidance to local technicians in the destination country. Some agents '
    'also offer to facilitate the region re-registration process with BYD by acting as an intermediary between '
    'the vehicle owner and BYD\'s regional and Chinese offices. The quality and reliability of these services '
    'varies significantly between providers, so it is essential to research each company thoroughly and seek '
    'recommendations from other import owners before engaging their services.', body_style))

story.append(Paragraph(
    '<b>Specialized Automotive Software Shops:</b> In several Middle Eastern cities, independent automotive '
    'electronics shops have developed expertise in modifying Chinese vehicle software. These shops typically '
    'use advanced diagnostic tools (including BYD\'s proprietary diagnostic system or compatible third-party '
    'tools) to flash firmware, unlock features, and configure vehicle systems for local use. The services '
    'offered can range from simple firmware updates to comprehensive system modifications that include '
    'installing global navigation apps, enabling CarPlay/Android Auto, and reconfiguring the user interface '
    'language. To find these shops, ask in local BYD owner groups or at independent Chinese car service centers.', body_style))

# ═══════════════════════════════════════════
# SECTION 5: FEATURE ENHANCEMENT
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>5. Enhancing Your Vehicle Without Full Firmware Updates</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'While waiting for a firmware update solution, there are several steps you can take to improve the '
    'functionality of your Chinese-spec BYD Yuan Plus for everyday use in the Middle East.', body_style))

story.append(Paragraph('<b>5.1 Navigation Solutions</b>', h2_style))
story.append(Paragraph(
    'The Chinese-spec DiLink system comes with Baidu Maps or AutoNavi (Gaode Maps) pre-installed, which '
    'rely on Chinese mapping data and services. While these apps technically work outside China for basic '
    'navigation, their map data, traffic information, and point-of-interest database are significantly less '
    'complete outside the Chinese mainland. Several practical alternatives exist that can work within the '
    'DiLink Android environment. Huawei Petal Maps is one of the most popular choices, as it provides global '
    'mapping data, works without Google Play Services, and can be sideloaded onto the DiLink system. Other '
    'options include Sygic, which offers offline navigation and does not require Google Services, and MapFactor, '
    'which provides free offline maps for the Middle East region. To install these apps, you may need to enable '
    'APK sideloading in the DiLink developer settings (accessible by tapping the build number seven times in '
    'Settings > About).', body_style))

story.append(Paragraph('<b>5.2 Enabling Android Auto or Apple CarPlay</b>', h2_style))
story.append(Paragraph(
    'One of the most sought-after features by import owners is Android Auto and Apple CarPlay support, which is '
    'not included in the Chinese-spec DiLink firmware. The XDA Forums community has been actively working on '
    'extracting CarPlay/Android Auto functionality from global BYD firmware and porting it to Chinese-spec '
    'systems. The thread "Possible Way to Add CarPlay to Chinese Version of BYD DiLink 4.0" documents a custom '
    'ROM approach targeting the Qualcomm QCM6125 platform used in BYD\'s infotainment systems. While this '
    'approach is technically complex and requires significant expertise in Android system modification, it '
    'represents the most promising path to adding these features without a full firmware conversion. '
    'Alternatively, wireless CarPlay/Android Auto adapters (such as Carlinkit) that connect through the USB '
    'port have been reported to work with some BYD models, providing a simpler but potentially less stable '
    'solution.', body_style))

story.append(Paragraph('<b>5.3 Keyboard and Language Settings</b>', h2_style))
story.append(Paragraph(
    'The Chinese-spec DiLink system may default to Chinese language and Chinese keyboard layouts. While the '
    'system does support English as a secondary language (accessible through Settings > Language), the input '
    'experience can be frustrating without proper keyboard configuration. Installing Microsoft SwiftKey through '
    'APK sideloading is a popular workaround, as it provides excellent multilingual keyboard support including '
    'English and Arabic layouts, and it does not require Google Play Services. This single change significantly '
    'improves the daily usability of the infotainment system for non-Chinese-speaking owners.', body_style))

# ═══════════════════════════════════════════
# SECTION 6: COMPARISON TABLE
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>6. Comparison of Available Options</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'The following table summarizes the main options available to imported BYD owners, comparing their '
    'effectiveness, cost, risk level, and practical considerations. This comparison is designed to help '
    'you make an informed decision based on your specific situation, technical comfort level, and budget.', body_style))

story.append(Spacer(1, 18))

# Table data
table_data = [
    [
        Paragraph('<b>Option</b>', th_style),
        Paragraph('<b>Cost</b>', th_style),
        Paragraph('<b>Risk</b>', th_style),
        Paragraph('<b>Effectiveness</b>', th_style),
        Paragraph('<b>Key Requirement</b>', th_style),
    ],
    [
        Paragraph('BYD Official<br/>Region Transfer', td_left),
        Paragraph('Free', td_style),
        Paragraph('None', td_style),
        Paragraph('Best (if approved)', td_style),
        Paragraph('Formal request with<br/>import documentation', td_left),
    ],
    [
        Paragraph('Dealer Firmware<br/>Update', td_left),
        Paragraph('$100 - $300', td_style),
        Paragraph('Low', td_style),
        Paragraph('High', td_style),
        Paragraph('Access to BYD dealer<br/>with diagnostic tools', td_left),
    ],
    [
        Paragraph('Pre-Export<br/>Global Flash', td_left),
        Paragraph('$200 - $1,000', td_style),
        Paragraph('Low', td_style),
        Paragraph('Permanent fix', td_style),
        Paragraph('Must be done before<br/>vehicle leaves China', td_left),
    ],
    [
        Paragraph('Community<br/>Firmware Files', td_left),
        Paragraph('Free', td_style),
        Paragraph('Medium-High', td_style),
        Paragraph('Variable', td_style),
        Paragraph('Technical expertise<br/>for manual flashing', td_left),
    ],
    [
        Paragraph('Third-Party<br/>Provider', td_left),
        Paragraph('$100 - $500', td_style),
        Paragraph('Medium', td_style),
        Paragraph('Good', td_style),
        Paragraph('Finding a reputable<br/>service provider', td_left),
    ],
    [
        Paragraph('Custom ROM<br/>(XDA Community)', td_left),
        Paragraph('Free', td_style),
        Paragraph('High', td_style),
        Paragraph('Experimental', td_style),
        Paragraph('Advanced Android<br/>development skills', td_left),
    ],
]

col_widths = [90, 70, 60, 85, 130]
table = Table(table_data, colWidths=col_widths)
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))

story.append(table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 1.</b> Comparison of software update options for imported BYD vehicles', caption_style))
story.append(Spacer(1, 18))

# ═══════════════════════════════════════════
# SECTION 7: RECOMMENDED ACTION PLAN
# ═══════════════════════════════════════════
story.append(Paragraph('<b>7. Recommended Action Plan</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'Based on the research compiled in this guide, the following step-by-step action plan is recommended for '
    'BYD Yuan Plus owners in Oman who need software updates for their imported vehicles. This plan is ordered '
    'from the lowest-risk, most official approach to progressively more involved alternatives.', body_style))

steps = [
    ('<b>Step 1: Check Your Current Firmware Version</b>',
     'Navigate to Settings > System > About in your DiLink interface and note your current software version, '
     'build number, and region code. This information will be essential for any dealer or service provider '
     'you contact. Take a clear photograph of this screen for your records.'),

    ('<b>Step 2: Contact BYD Middle East and Africa Officially</b>',
     'Visit byd.com/mea or byd.com/om and use their official contact form, email, or phone number to submit '
     'a formal request for software update support. Include your VIN, current firmware version, proof of '
     'purchase, and proof of import. Request that your vehicle be registered in their regional update system. '
     'Be polite but persistent; follow up every two weeks until you receive a definitive response.'),

    ('<b>Step 3: Visit a BYD Dealer or Service Center</b>',
     'Contact authorized BYD service centers in your region (Oman, UAE, or Saudi Arabia if accessible) and '
     'ask whether they can perform a manual firmware update using their diagnostic tools. Even if they are '
     'not your original dealer, many service centers will perform software updates for a fee. Ask specifically '
     'about updating to the latest GCC firmware version for your model.'),

    ('<b>Step 4: Join BYD Owner Communities</b>',
     'Join active BYD owner groups on Facebook and Telegram (t.me/just_byd). Post about your specific '
     'situation, including your vehicle model, year, and current firmware version. Community members often '
     'share firmware files, installation guides, and contacts for trusted service providers in your region. '
     'These communities are also the best source for discovering new solutions as they emerge.'),

    ('<b>Step 5: Explore Third-Party Service Providers</b>',
     'If official channels do not provide a solution, ask in community groups for recommendations of '
     'reputable third-party service providers who specialize in Chinese vehicle software. Get references '
     'from other owners who have used their services before committing to any work. Verify the provider\'s '
     'experience with your specific BYD model and DiLink version.'),

    ('<b>Step 6: Improve Daily Usability While You Wait</b>',
     'In the meantime, sideload alternative navigation apps (Petal Maps or Sygic), install Microsoft '
     'SwiftKey for keyboard support, and explore CarPlay/Android Auto adapters for smartphone integration. '
     'These improvements make the vehicle much more usable while you work on the firmware update solution.'),
]

for step_title, step_desc in steps:
    story.append(Paragraph(step_title, h3_style))
    story.append(Paragraph(step_desc, body_style))

# ═══════════════════════════════════════════
# SECTION 8: IMPORTANT WARNINGS
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>8. Important Warnings and Considerations</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'Before pursuing any software modification on your BYD vehicle, it is critical to understand the risks '
    'and potential consequences involved. This section outlines the key warnings that every import owner '
    'should consider before taking action.', body_style))

story.append(Paragraph(
    '<b>Warranty Implications:</b> Modifying your vehicle\'s software, especially through unofficial channels '
    'such as community firmware files or custom ROMs, may void your remaining warranty coverage. BYD\'s '
    'warranty terms typically include clauses that exclude coverage for issues arising from unauthorized '
    'software modifications. If your vehicle experiences a hardware or software problem after an unofficial '
    'firmware update, BYD and its dealers may refuse to provide warranty service. Weigh this risk carefully '
    'against the benefits of the update, particularly if your vehicle is still within its warranty period. '
    'Dealer-performed updates using official diagnostic tools are the least likely to affect your warranty, '
    'as they use approved firmware and procedures.', body_style))

story.append(Paragraph(
    '<b>Bricking Risk:</b> Incorrectly installed firmware can render your vehicle\'s infotainment system '
    'inoperable, a situation commonly known as "bricking." In severe cases, a failed firmware update can '
    'affect more than just the infotainment system; some BYD models integrate vehicle control functions '
    '(climate control, charging settings, driver assistance) into the DiLink system, meaning a software '
    'failure could impact core vehicle functionality. Always ensure that any firmware update is performed '
    'with a stable power supply (the vehicle should be plugged in and charging during the process) and that '
    'you have a way to recover from a failed update (such as access to a BYD service center with recovery tools).', body_style))

story.append(Paragraph(
    '<b>Chinese vs. Global Firmware Compatibility:</b> Installing Chinese-market firmware updates on a vehicle '
    'operating outside China may introduce features or settings that are inappropriate or non-functional in your '
    'region. For example, Chinese firmware may include emergency calling features that connect to Chinese '
    'emergency services, or data collection and telemetry settings that transmit data to Chinese servers. '
    'Additionally, Chinese firmware updates do not include features specifically developed for the Middle East '
    'market, such as Arabic language support or GCC-specific regulatory compliance. Global firmware is '
    'generally preferable for vehicles operating outside China, as it includes region-appropriate features and '
    'compliance settings.', body_style))

story.append(Paragraph(
    '<b>Data Privacy:</b> Chinese-spec BYD vehicles include connectivity features that transmit vehicle data '
    '(location, driving patterns, system status) to BYD\'s Chinese servers. This data collection is governed '
    'by Chinese data protection regulations, which may not provide the same level of privacy protection as '
    'regulations in your home country. Be aware that using Chinese-spec firmware means your vehicle data is '
    'being processed under Chinese data governance frameworks. Global firmware redirects data to regional '
    'servers, which may offer different (and potentially more familiar) data protection standards.', body_style))

# ═══════════════════════════════════════════
# SECTION 9: KEY CONTACTS
# ═══════════════════════════════════════════
story.append(Spacer(1, 12))
story.append(Paragraph('<b>9. Key Contacts and Resources</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'The following table provides a consolidated reference of the most important contacts and online '
    'resources for BYD import owners seeking software update support.', body_style))

story.append(Spacer(1, 18))

contact_data = [
    [
        Paragraph('<b>Resource</b>', th_style),
        Paragraph('<b>Details</b>', th_style),
        Paragraph('<b>Use For</b>', th_style),
    ],
    [
        Paragraph('BYD Middle East', td_left),
        Paragraph('byd.com/mea', td_left),
        Paragraph('Official regional support<br/>and update requests', td_left),
    ],
    [
        Paragraph('BYD Oman', td_left),
        Paragraph('byd.com/om', td_left),
        Paragraph('Oman-specific support<br/>and dealer information', td_left),
    ],
    [
        Paragraph('BYD EU FAQ', td_left),
        Paragraph('byd.com/eu/service-maintenance/<br/>frequently-asked-questions', td_left),
        Paragraph('Troubleshooting and<br/>update guidance', td_left),
    ],
    [
        Paragraph('Telegram: Just BYD', td_left),
        Paragraph('t.me/just_byd', td_left),
        Paragraph('Firmware files, update<br/>news, community support', td_left),
    ],
    [
        Paragraph('XDA Forums', td_left),
        Paragraph('xdaforums.com (search<br/>"BYD DiLink")', td_left),
        Paragraph('Custom ROM development,<br/>CarPlay/Android Auto', td_left),
    ],
    [
        Paragraph('Reddit: r/BYD', td_left),
        Paragraph('reddit.com/r/BYD', td_left),
        Paragraph('Owner discussions,<br/>import experiences', td_left),
    ],
    [
        Paragraph('Facebook Groups', td_left),
        Paragraph('Search "BYD Owners"<br/>or "BYD Middle East"', td_left),
        Paragraph('Regional owner networks,<br/>dealer recommendations', td_left),
    ],
]

contact_table = Table(contact_data, colWidths=[110, 170, 160])
contact_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))

story.append(contact_table)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Table 2.</b> Key contacts and resources for BYD imported vehicle owners', caption_style))
story.append(Spacer(1, 18))

# ═══════════════════════════════════════════
# SECTION 10: OUTLOOK
# ═══════════════════════════════════════════
story.append(Paragraph('<b>10. The Road Ahead: Improving Prospects</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'The situation for BYD import owners, while frustrating, is steadily improving. Several positive trends '
    'suggest that the software update gap will narrow significantly in the coming years. BYD is aggressively '
    'expanding its official presence in the Middle East, with new dealership openings, service center '
    'investments, and regional headquarters being established across the GCC. This expansion brings with it '
    'greater technical capability to support vehicles in the region, including the potential to extend support '
    'to imported vehicles that were originally registered for the Chinese market.', body_style))

story.append(Paragraph(
    'BYD has already demonstrated its ability to deliver region-specific OTA updates outside China. In late 2024 '
    'and early 2025, the company rolled out its first major OTA update outside China for the European market, '
    'and it has followed this with GCC-specific updates for the ATTO 3. These updates show that BYD\'s '
    'regional software infrastructure is maturing and becoming capable of supporting vehicles across diverse '
    'markets. As this infrastructure expands, it becomes increasingly feasible for BYD to offer region transfer '
    'services or cross-region update support for imported vehicles.', body_style))

story.append(Paragraph(
    'The growing community of BYD import owners is also a powerful force for change. Facebook groups, Reddit '
    'communities, and Telegram channels collectively represent thousands of affected owners who are actively '
    'sharing information, lobbying BYD, and developing technical solutions. This organized community pressure '
    'has already influenced BYD\'s approach in some markets, and it will continue to be a significant factor '
    'as BYD\'s global customer base grows. If you are an affected owner, joining these communities and '
    'contributing to collective action is one of the most impactful things you can do, both for yourself and '
    'for future import owners.', body_style))

story.append(Paragraph(
    'Finally, competitive pressure from other Chinese automakers who are more responsive to import owner needs '
    'may encourage BYD to adopt more flexible policies. Companies like NIO, which has entered a technology '
    'licensing agreement with Abu Dhabi\'s CYVN Holdings, and other Chinese EV manufacturers expanding into '
    'the Middle East are setting customer service expectations that BYD will need to meet or exceed to '
    'maintain its market position. The intersection of these trends suggests that the software update situation '
    'for imported BYD vehicles, while currently challenging, is likely to improve substantially in the near '
    'to medium term.', body_style))

# ── Build ──
doc.build(story)
print(f"PDF generated successfully at: {output_path}")
