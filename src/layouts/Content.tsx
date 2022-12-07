import Head from 'next/head'
import { useRouter } from 'next/router'
import { ReactNode, useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'

import { Button, Skeleton, Typography, mq } from '@ensdomains/thorin'

import ArrowLeftSVG from '@app/assets/ArrowLeft.svg'
import { ErrorContainer } from '@app/components/@molecules/ErrorContainer'
import { HamburgerRoutes } from '@app/components/@molecules/HamburgerRoutes'
import { LeadingHeading } from '@app/components/LeadingHeading'
import { useBreakpoint } from '@app/utils/BreakpointProvider'

const HeadingItems = styled.div<{ $spacing: string }>(
  ({ theme, $spacing }) => css`
    grid-column: span 1;
    width: 100%;
    max-width: 100%;

    display: grid;
    grid-template-columns: 1fr;
    gap: ${theme.space['5']};
    align-self: center;
    align-items: center;
    min-height: ${theme.space['15']};
    ${mq.md.min(css`
      min-height: ${theme.space['10']};
      grid-column: span 2;
      grid-template-columns: ${$spacing};
    `)}
  `,
)

const CustomLeadingHeading = styled(LeadingHeading)<{
  $customSpacing: boolean
}>(
  ({ theme, $customSpacing }) => css`
    gap: ${theme.space['2']};
    ${$customSpacing &&
    mq.sm.min(css`
      width: ${theme.space.full};
      margin-left: 0;
    `)}
  `,
)

const ContentContainer = styled.div<{ $multiColumn?: boolean }>(
  ({ $multiColumn }) => css`
    margin: 0;
    padding: 0;
    min-height: 0;
    height: min-content;

    ${$multiColumn &&
    mq.sm.min(css`
      grid-column: span 2;
    `)}
  `,
)

const ContentPlaceholder = styled.div(
  () => css`
    display: none;
    height: 0;
    width: 0;
    ${mq.md.min(css`
      display: block;
    `)}
  `,
)

const BackArrow = styled.div(
  ({ theme }) => css`
    width: ${theme.space['6']};
    height: ${theme.space['6']};
    display: block;
  `,
)

const WarningWrapper = styled.div(
  () => css`
    width: 100%;
    grid-column: span 1;
    height: min-content;
    ${mq.md.min(css`
      grid-column: span 2;
    `)}
  `,
)

const FullWidthSkeleton = styled.div(
  ({ theme }) => css`
    width: ${theme.space.full};
  `,
)

const TitleContainer = styled.div(
  () => css`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
  `,
)

const TitleWrapper = styled.div<{ $invert: boolean }>(
  ({ $invert }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;

    ${TitleContainer} {
      align-items: flex-start;
    }

    ${$invert &&
    css`
      flex-direction: row-reverse;

      ${TitleContainer} {
        align-items: flex-end;
      }
    `}
  `,
)

const DummyTitle = styled(Typography)(
  ({ theme }) => css`
    font-size: ${theme.fontSizes.extraLarge};
    white-space: pre-wrap;
  `,
)

const Title = styled(Typography)(
  ({ theme }) => css`
    font-size: ${theme.fontSizes.extraLarge};
    line-height: ${theme.lineHeights.normal};
    position: absolute;
    top: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
)

const Subtitle = styled(Typography)(
  ({ theme }) => css`
    line-height: ${theme.lineHeights.normal};
    color: ${theme.colors.textTertiary};
  `,
)

const CompactTitle = ({
  invert,
  showSubtitle,
  title,
  subtitle,
  titleButton,
}: {
  invert: boolean
  showSubtitle: boolean
  title: string
  subtitle?: string
  titleButton: ReactNode
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [titleWidth, setTitleWidth] = useState(0)

  const callback = () => {
    const { current } = ref
    if (current) {
      const parent = current.parentElement!
      const parentGap = parseInt(window.getComputedStyle(parent).getPropertyValue('gap'))
      let newWidth = parent.offsetWidth
      for (const child of parent.children) {
        if (child !== current) {
          newWidth -= child.clientWidth + parentGap
        }
      }
      setTitleWidth(newWidth)
    }
  }

  useEffect(() => {
    const observer = new ResizeObserver(callback)
    observer.observe(document.body)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <ContentContainer ref={ref}>
      <TitleWrapper $invert={invert}>
        {titleButton}
        <TitleContainer>
          <DummyTitle weight="bold"> </DummyTitle>
          <Title
            className="shrinkable-title"
            weight="bold"
            style={{ maxWidth: titleWidth, overflow: 'hidden' }}
          >
            {title}
          </Title>
          {showSubtitle && <Subtitle weight="bold">{subtitle}</Subtitle>}
        </TitleContainer>
      </TitleWrapper>
    </ContentContainer>
  )
}

export const Content = ({
  children,
  loading,
  noTitle,
  title,
  subtitle,
  alwaysShowSubtitle,
  singleColumnContent,
  titleButton,
  hideBack,
  hideHeading,
  spacing = '270px 2fr',
}: {
  noTitle?: boolean
  title: string
  subtitle?: string
  titleButton?: React.ReactNode
  alwaysShowSubtitle?: boolean
  singleColumnContent?: boolean
  loading?: boolean
  spacing?: string
  hideBack?: boolean
  hideHeading?: boolean
  children: {
    warning?: {
      type: 'warning' | 'error' | 'info'
      message: string | React.ReactNode
    }
    info?: React.ReactNode
    header?: React.ReactNode
    leading?: React.ReactNode
    trailing: React.ReactNode
  }
}) => {
  const router = useRouter()
  const breakpoints = useBreakpoint()

  const hasBack = router.query.from && !hideBack

  const WarningComponent = !loading && children.warning && (
    <WarningWrapper>
      <ErrorContainer message={children.warning.message} type={children.warning.type} />
    </WarningWrapper>
  )

  const InfoComponent = !loading && children.info && (
    <WarningWrapper>{children.info}</WarningWrapper>
  )

  let LeadingComponent: ReactNode = children.leading ? (
    <ContentContainer>
      <Skeleton loading={loading}>{children.leading}</Skeleton>
    </ContentContainer>
  ) : (
    <ContentPlaceholder />
  )

  if (!children.leading && singleColumnContent) LeadingComponent = null

  return (
    <>
      {!noTitle && (
        <Head>
          <title>{title} - ENS</title>
        </Head>
      )}

      {breakpoints.md && WarningComponent}

      {breakpoints.md && InfoComponent}

      {!hideHeading && (
        <HeadingItems $spacing={spacing}>
          <Skeleton loading={loading} as={FullWidthSkeleton as any}>
            <CustomLeadingHeading $customSpacing={spacing !== '270px 2fr'}>
              {hasBack && (
                <div data-testid="back-button">
                  <Button
                    onClick={() => router.back()}
                    variant="transparent"
                    shadowless
                    size="extraSmall"
                  >
                    <BackArrow as={ArrowLeftSVG} />
                  </Button>
                </div>
              )}
              <CompactTitle
                invert={!!hasBack}
                showSubtitle={!!(subtitle && (!breakpoints.md || alwaysShowSubtitle))}
                subtitle={subtitle}
                title={title}
                titleButton={titleButton}
              />
              {!hasBack && !breakpoints.md && <HamburgerRoutes />}
            </CustomLeadingHeading>
          </Skeleton>
          {children.header && breakpoints.md && (
            <ContentContainer>
              <Skeleton loading={loading}>{children.header}</Skeleton>
            </ContentContainer>
          )}
        </HeadingItems>
      )}

      {!breakpoints.md && WarningComponent}
      {!breakpoints.md && InfoComponent}

      {LeadingComponent}

      {children.header && !breakpoints.md && (
        <ContentContainer>
          <Skeleton loading={loading}>{children.header}</Skeleton>
        </ContentContainer>
      )}
      <ContentContainer $multiColumn={singleColumnContent}>
        <Skeleton loading={loading} as={FullWidthSkeleton as any}>
          {children.trailing}
        </Skeleton>
      </ContentContainer>
    </>
  )
}
